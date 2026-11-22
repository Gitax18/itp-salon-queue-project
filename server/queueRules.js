// ALL queue rules live here (see docs/03-flows-rules.md): status transitions,
// waiting-time estimate, join cutoff, one-spot-per-phone. Routes only call these functions.
const store = require('./store')

const ACTIVE = ['waiting', 'called', 'in_chair']
const TIMEZONE = 'Asia/Kolkata'

// One clock for every rule, so tests can move time (see test/rules.test.js).
let clock = () => Date.now()
const nowMs = () => clock()
function __setClock(fn) {
  clock = fn || (() => Date.now())
}

// ---------- helpers ----------

function minutesNowLocal(now = new Date(nowMs())) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now)
  const get = (type) => Number(parts.find((p) => p.type === type).value)
  return get('hour') * 60 + get('minute')
}

// Rule 10: online joining closes 30 min before closing, or when owner closes the queue.
// IGNORE_HOURS=1 skips the clock check (for testing outside salon hours).
function isJoiningOpen(now = new Date(nowMs())) {
  const { queueOpen, closesAt, cutoffMinutes } = store.settings
  if (!queueOpen) return false
  if (process.env.IGNORE_HOURS === '1') return true
  const [h, m] = closesAt.split(':').map(Number)
  return minutesNowLocal(now) < h * 60 + m - cutoffMinutes
}

function serviceById(id) {
  return store.services.find((s) => s.id === id)
}

function totals(customer) {
  return customer.serviceIds.reduce(
    (sum, id) => {
      const s = serviceById(id)
      return s ? { minutes: sum.minutes + s.minutes, price: sum.price + s.price } : sum
    },
    { minutes: 0, price: 0 },
  )
}

function workingBarbers() {
  return store.barbers.filter((b) => b.onDuty && !b.onBreak)
}

function barberStatus(barber) {
  if (!barber.onDuty) return 'off'
  if (barber.onBreak) return 'break'
  const busy = store.customers.some(
    (c) => c.assignedBarberId === barber.id && (c.status === 'called' || c.status === 'in_chair'),
  )
  return busy ? 'busy' : 'free'
}

function findCustomer(id) {
  if (!id) return null
  const key = String(id).toUpperCase()
  return store.customers.find((c) => c.id === key) || null
}

function findActiveByPhone(phone) {
  return store.customers.find((c) => c.phone === phone && ACTIVE.includes(c.status)) || null
}

// ---------- waiting time (rule 5) ----------

// Minutes until a customer who chose `barberId` and sits behind everyone with number < beforeNumber
// would reach a chair. null = no eligible barber is working.
function estimateWait(barberId, beforeNumber = Infinity, now = nowMs()) {
  const eligible = workingBarbers().filter((b) => barberId === 'any' || b.id === barberId)
  if (eligible.length === 0) return null
  const ids = eligible.map((b) => b.id)

  let ahead = 0
  for (const c of store.customers) {
    const mins = totals(c).minutes
    if (c.status === 'in_chair' && ids.includes(c.assignedBarberId)) {
      const elapsed = Math.floor((now - c.startedAt) / 60000)
      ahead += Math.max(0, mins - elapsed)
    } else if (c.status === 'called' && c.number < beforeNumber && ids.includes(c.assignedBarberId)) {
      ahead += mins
    } else if (
      c.status === 'waiting' &&
      c.number < beforeNumber &&
      (c.barberId === 'any' || ids.includes(c.barberId))
    ) {
      ahead += mins
    }
  }
  return Math.ceil(ahead / ids.length / 5) * 5
}

// ---------- auto-call (rule 3a) ----------

// Earliest waiting customers get free working barbers they chose (or any free barber for "Any").
// Runs after every change that could free a barber or add a customer.
function autoCall(now = nowMs()) {
  const waiting = store.customers
    .filter((c) => c.status === 'waiting')
    .sort((a, b) => a.number - b.number)
  for (const c of waiting) {
    const barber = workingBarbers().find(
      (b) => (c.barberId === 'any' || c.barberId === b.id) && barberStatus(b) === 'free',
    )
    if (!barber) continue
    c.status = 'called'
    c.assignedBarberId = barber.id
    c.calledAt = now
  }
}

// ---------- join / cancel ----------

function validateJoin({ name, phone, serviceIds, barberId }) {
  const cleanName = String(name || '').trim()
  if (cleanName.length < 2 || cleanName.length > 60) return 'invalid_name'
  if (!/^\d{10}$/.test(String(phone || ''))) return 'invalid_phone'
  if (!Array.isArray(serviceIds) || serviceIds.length < 1 || serviceIds.length > 3) return 'invalid_services'
  if (new Set(serviceIds).size !== serviceIds.length) return 'invalid_services'
  if (!serviceIds.every((id) => serviceById(id)?.on)) return 'invalid_services'
  if (barberId !== 'any' && !store.barbers.some((b) => b.id === barberId && b.onDuty)) return 'invalid_barber'
  return null
}

// Rule 6 first (existing spot wins), then cutoff, then validation.
// walkIn=true (receptionist): allowed even when online joining is closed.
function join(input, { walkIn = false } = {}) {
  const existing = findActiveByPhone(String(input?.phone || ''))
  if (existing) return { spot: existing, existing: true }
  if (!walkIn && !isJoiningOpen()) return { error: 'closed' }
  const error = validateJoin(input || {})
  if (error) return { error }

  const number = store.nextToken++
  const customer = {
    number,
    id: `S-${number}`,
    name: String(input.name).trim(),
    phone: input.phone,
    serviceIds: [...input.serviceIds],
    barberId: input.barberId,
    status: 'waiting',
    assignedBarberId: null,
    joinedAt: nowMs(),
    calledAt: null,
    startedAt: null,
    finishedAt: null,
  }
  store.customers.push(customer)
  autoCall()
  return { spot: customer, existing: false }
}

// Rule 9: Waiting -> Cancelled, Called -> Cancelled. Final states stay final.
function cancel(id) {
  const c = findCustomer(id)
  if (!c) return { error: 'not_found' }
  if (c.status !== 'waiting' && c.status !== 'called') return { error: 'not_cancellable' }
  c.status = 'cancelled'
  c.assignedBarberId = null
  c.finishedAt = nowMs()
  autoCall()
  return { spot: c }
}

// ---------- staff: PIN, call next, no-show (rules 3, 4, 8, 15) ----------

function checkPin(pin) {
  return String(pin ?? '') === (process.env.STAFF_PIN || '2468')
}

function noShowAfterMinutes() {
  const raw = process.env.NOSHOW_MINUTES
  const v = raw === undefined || raw === '' ? NaN : Number(raw)
  return Number.isFinite(v) ? v : 10
}

// Earliest waiting customer this barber may serve: chose this barber or "Any" (never another barber).
function nextEligibleFor(barber) {
  return (
    store.customers
      .filter((c) => c.status === 'waiting' && (c.barberId === 'any' || c.barberId === barber.id))
      .sort((a, b) => a.number - b.number)[0] || null
  )
}

function callNext(barberId) {
  const barber = store.barbers.find((b) => b.id === barberId)
  if (!barber) return { error: 'not_found' }
  if (!barber.onDuty || barber.onBreak) return { error: 'barber_unavailable' }
  if (barberStatus(barber) === 'busy') return { error: 'barber_busy' }
  const next = nextEligibleFor(barber)
  if (!next) return { error: 'no_eligible' }
  next.status = 'called'
  next.assignedBarberId = barber.id
  next.calledAt = nowMs()
  return { spot: next }
}

function noShow(id, now = nowMs()) {
  const c = findCustomer(id)
  if (!c) return { error: 'not_found' }
  if (c.status !== 'called') return { error: 'not_called' }
  if (now - c.calledAt < noShowAfterMinutes() * 60000) return { error: 'too_early' }
  c.status = 'no_show'
  c.assignedBarberId = null
  c.finishedAt = now
  autoCall(now)
  return { spot: c }
}

function receptionView(now = nowMs()) {
  const barbers = store.barbers.map((b) => {
    const status = barberStatus(b)
    const cur = store.customers.find(
      (c) => c.assignedBarberId === b.id && (c.status === 'called' || c.status === 'in_chair'),
    )
    let current = null
    if (cur) {
      const total = totals(cur).minutes
      const elapsed = cur.startedAt ? Math.floor((now - cur.startedAt) / 60000) : 0
      current = {
        id: cur.id,
        name: cur.name,
        status: cur.status,
        services: cur.serviceIds.map((sid) => serviceById(sid)?.name),
        totalMinutes: total,
        minutesLeft: cur.status === 'in_chair' ? Math.max(0, total - elapsed) : total,
      }
    }
    return {
      id: b.id,
      name: b.name,
      status,
      current,
      canCallNext: status === 'free' && nextEligibleFor(b) !== null,
    }
  })

  const queue = store.customers
    .filter((c) => c.status === 'waiting' || c.status === 'called')
    .sort((a, b) => (a.status === b.status ? a.number - b.number : a.status === 'called' ? -1 : 1))
    .map((c) => {
      const chosen = store.barbers.find((b) => b.id === c.barberId)
      const assigned = store.barbers.find((b) => b.id === c.assignedBarberId)
      return {
        id: c.id,
        name: c.name,
        status: c.status,
        services: c.serviceIds.map((sid) => serviceById(sid)?.name),
        totalMinutes: totals(c).minutes,
        barberId: c.barberId,
        barberName: chosen ? chosen.name : null,
        calledBarberName: assigned ? assigned.name : null,
        waitedMinutes: Math.floor((now - c.joinedAt) / 60000),
        canNoShow:
          c.status === 'called' && now - c.calledAt >= noShowAfterMinutes() * 60000,
      }
    })

  return {
    barbers,
    queue,
    services: store.services.filter((s) => s.on),
    settings: { queueOpen: store.settings.queueOpen, joiningOpen: isJoiningOpen() },
    noShowMinutes: noShowAfterMinutes(),
  }
}

// ---------- views for the API ----------

function spotView(c) {
  const t = totals(c)
  const chosen = store.barbers.find((b) => b.id === c.barberId)
  const assigned = store.barbers.find((b) => b.id === c.assignedBarberId)
  const waiting = c.status === 'waiting'
  const position = waiting
    ? store.customers.filter((o) => o.status === 'waiting' && o.number < c.number).length + 1
    : 0
  return {
    id: c.id,
    name: c.name,
    status: c.status,
    services: c.serviceIds.map((id) => {
      const s = serviceById(id)
      return { id, name: s.name, minutes: s.minutes, price: s.price }
    }),
    totalMinutes: t.minutes,
    totalPrice: t.price,
    barberId: c.barberId,
    barberName: chosen ? chosen.name : null,
    barberOnBreak: Boolean(chosen && chosen.onDuty && chosen.onBreak),
    barberOffDuty: Boolean(chosen && !chosen.onDuty),
    calledBarberName: assigned ? assigned.name : null,
    position,
    waitMinutes: waiting ? estimateWait(c.barberId, c.number) : 0,
  }
}

function publicView() {
  const waits = { any: estimateWait('any') }
  for (const b of store.barbers) waits[b.id] = estimateWait(b.id)
  return {
    settings: {
      queueOpen: store.settings.queueOpen,
      joiningOpen: isJoiningOpen(),
      closesLabel: store.settings.closesLabel,
    },
    services: store.services.filter((s) => s.on),
    barbers: store.barbers.map((b) => ({ id: b.id, name: b.name, status: barberStatus(b) })),
    queue: {
      waiting: store.customers.filter((c) => c.status === 'waiting').length,
      waitMinutes: waits.any,
    },
    waits,
  }
}

// ---------- barber actions (rules 4, 11) ----------

function currentFor(barber) {
  return (
    store.customers.find(
      (c) => c.assignedBarberId === barber.id && (c.status === 'called' || c.status === 'in_chair'),
    ) || null
  )
}

// Called -> In chair
function barberStart(barberId, now = nowMs()) {
  const barber = store.barbers.find((b) => b.id === barberId)
  if (!barber) return { error: 'not_found' }
  const cur = currentFor(barber)
  if (!cur || cur.status !== 'called') return { error: 'nothing_to_start' }
  cur.status = 'in_chair'
  cur.startedAt = now
  return { spot: cur }
}

// In chair -> Done, then the next eligible customer is called automatically (rule 3a)
function barberDone(barberId, now = nowMs()) {
  const barber = store.barbers.find((b) => b.id === barberId)
  if (!barber) return { error: 'not_found' }
  const cur = currentFor(barber)
  if (!cur || cur.status !== 'in_chair') return { error: 'nothing_to_finish' }
  cur.status = 'done'
  cur.finishedAt = now
  cur.assignedBarberId = null
  autoCall(now)
  return { spot: cur }
}

// Rule 11: no break while a customer is Called or In chair. Rule 16: off-duty barbers can't go on break.
function setBreak(barberId, onBreak) {
  const barber = store.barbers.find((b) => b.id === barberId)
  if (!barber) return { error: 'not_found' }
  if (!barber.onDuty) return { error: 'off_duty' }
  if (onBreak && currentFor(barber)) return { error: 'finish_first' }
  barber.onBreak = Boolean(onBreak)
  autoCall()
  return { barber }
}

function barberView(barberId, now = nowMs()) {
  const barber = store.barbers.find((b) => b.id === barberId)
  if (!barber) return null
  const cur = currentFor(barber)
  const next = barber.onDuty && !barber.onBreak ? nextEligibleFor(barber) : null
  const view = (c) => ({
    id: c.id,
    name: c.name,
    status: c.status,
    services: c.serviceIds.map((sid) => serviceById(sid)?.name),
    totalMinutes: totals(c).minutes,
  })
  return {
    id: barber.id,
    name: barber.name,
    onDuty: barber.onDuty,
    onBreak: barber.onBreak,
    status: barberStatus(barber),
    current: cur
      ? {
          ...view(cur),
          startedAt: cur.startedAt,
          elapsedSeconds: cur.startedAt ? Math.floor((now - cur.startedAt) / 1000) : 0,
        }
      : null,
    next: next ? view(next) : null,
  }
}

// Public waiting-area TV feed: tokens and barber names only (no customer names or phones).
function displayView() {
  const upNext = store.customers
    .filter((c) => c.status === 'waiting')
    .sort((a, b) => a.number - b.number)
    .slice(0, 5)
    .map((c) => ({ id: c.id, waitMinutes: estimateWait(c.barberId, c.number) }))
  return {
    settings: {
      queueOpen: store.settings.queueOpen,
      joiningOpen: isJoiningOpen(),
      closesLabel: store.settings.closesLabel,
    },
    barbers: store.barbers.map((b) => {
      const cur = currentFor(b)
      return {
        id: b.id,
        name: b.name,
        status: barberStatus(b),
        nowToken: cur ? cur.id : null,
        nowStatus: cur ? cur.status : null,
      }
    }),
    upNext,
    waiting: store.customers.filter((c) => c.status === 'waiting').length,
  }
}

// ---------- owner settings (rules 16-18) ----------

function dayKey(ms) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(ms))
}

// Rule 17. "Today" = salon calendar day (Asia/Kolkata).
function todayStats(now = nowMs()) {
  const today = dayKey(now)
  const isToday = (ms) => ms != null && dayKey(ms) === today
  const served = store.customers.filter((c) => c.status === 'done' && isToday(c.finishedAt)).length
  const noShows = store.customers.filter((c) => c.status === 'no_show' && isToday(c.finishedAt)).length
  const called = store.customers.filter((c) => isToday(c.calledAt))
  const averageWait = called.length
    ? Math.round(called.reduce((sum, c) => sum + (c.calledAt - c.joinedAt) / 60000, 0) / called.length)
    : null
  return { served, noShows, averageWait }
}

function adminView() {
  return {
    settings: {
      queueOpen: store.settings.queueOpen,
      joiningOpen: isJoiningOpen(),
      closesLabel: store.settings.closesLabel,
    },
    services: store.services,
    barbers: store.barbers.map((b) => ({
      id: b.id,
      name: b.name,
      onDuty: b.onDuty,
      status: barberStatus(b),
    })),
    stats: todayStats(),
  }
}

function setQueueOpen(open) {
  store.settings.queueOpen = Boolean(open)
  return {}
}

// Rule 16
function setBarberDuty(barberId, onDuty) {
  const barber = store.barbers.find((b) => b.id === barberId)
  if (!barber) return { error: 'not_found' }
  if (!onDuty && currentFor(barber)) return { error: 'finish_first' }
  barber.onDuty = Boolean(onDuty)
  if (!barber.onDuty) barber.onBreak = false
  autoCall()
  return {}
}

// Rule 18 validation. Returns an error code or null. `partial` allows missing fields (edits).
function validateServiceFields(f, partial) {
  const has = (k) => f[k] !== undefined
  if (!partial || has('name')) {
    const en = String(f.name?.en ?? '').trim()
    const gu = String(f.name?.gu ?? '').trim()
    if (en.length < 1 || en.length > 40 || gu.length < 1 || gu.length > 40) return 'invalid_name'
  }
  if (!partial || has('minutes')) {
    if (!Number.isInteger(f.minutes) || f.minutes < 5 || f.minutes > 180) return 'invalid_minutes'
  }
  if (!partial || has('price')) {
    if (!Number.isInteger(f.price) || f.price < 0 || f.price > 5000) return 'invalid_price'
  }
  if (has('on') && typeof f.on !== 'boolean') return 'invalid_on'
  return null
}

function addService(input) {
  const f = input || {}
  const error = validateServiceFields(f, false)
  if (error) return { error }
  const base = String(f.name.en).trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'service'
  let id = base
  for (let n = 2; store.services.some((s) => s.id === id); n++) id = `${base}-${n}`
  store.services.push({
    id,
    name: { en: String(f.name.en).trim(), gu: String(f.name.gu).trim() },
    minutes: f.minutes,
    price: f.price,
    on: true,
  })
  return {}
}

function updateService(id, input) {
  const service = serviceById(id)
  if (!service) return { error: 'not_found' }
  const f = input || {}
  const error = validateServiceFields(f, true)
  if (error) return { error }
  if (f.name) service.name = { en: String(f.name.en).trim(), gu: String(f.name.gu).trim() }
  if (f.minutes !== undefined) service.minutes = f.minutes
  if (f.price !== undefined) service.price = f.price
  if (f.on !== undefined) service.on = f.on
  return {}
}

module.exports = {
  __setClock,
  adminView,
  setQueueOpen,
  setBarberDuty,
  addService,
  updateService,
  isJoiningOpen,
  estimateWait,
  join,
  cancel,
  findCustomer,
  findActiveByPhone,
  checkPin,
  callNext,
  noShow,
  receptionView,
  spotView,
  publicView,
  barberStart,
  barberDone,
  setBreak,
  barberView,
  displayView,
}
