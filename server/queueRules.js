// ALL queue rules live here (see docs/03-flows-rules.md): status transitions,
// waiting-time estimate, join cutoff, one-spot-per-phone. Routes only call these functions.
const store = require('./store')

const ACTIVE = ['waiting', 'called', 'in_chair']
const TIMEZONE = 'Asia/Kolkata'

// ---------- helpers ----------

function minutesNowLocal(now = new Date()) {
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
function isJoiningOpen(now = new Date()) {
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
function estimateWait(barberId, beforeNumber = Infinity, now = Date.now()) {
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
function join(input) {
  const existing = findActiveByPhone(String(input?.phone || ''))
  if (existing) return { spot: existing, existing: true }
  if (!isJoiningOpen()) return { error: 'closed' }
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
    joinedAt: Date.now(),
    calledAt: null,
    startedAt: null,
    finishedAt: null,
  }
  store.customers.push(customer)
  return { spot: customer, existing: false }
}

// Rule 9: Waiting -> Cancelled, Called -> Cancelled. Final states stay final.
function cancel(id) {
  const c = findCustomer(id)
  if (!c) return { error: 'not_found' }
  if (c.status !== 'waiting' && c.status !== 'called') return { error: 'not_cancellable' }
  c.status = 'cancelled'
  c.assignedBarberId = null
  c.finishedAt = Date.now()
  return { spot: c }
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

// ---------- TEMPORARY dev helpers (removed in Steps 4-5 when Reception/Barber screens exist) ----------

// waiting -> called (assign chosen barber, or first free working barber) -> in_chair -> done
function devAdvance(id) {
  const c = findCustomer(id)
  if (!c) return { error: 'not_found' }
  const now = Date.now()
  if (c.status === 'waiting') {
    const candidates = workingBarbers().filter((b) => c.barberId === 'any' || b.id === c.barberId)
    const target = candidates.find((b) => barberStatus(b) === 'free') || candidates[0]
    if (!target) return { error: 'no_barber' }
    c.status = 'called'
    c.assignedBarberId = target.id
    c.calledAt = now
  } else if (c.status === 'called') {
    c.status = 'in_chair'
    c.startedAt = now
  } else if (c.status === 'in_chair') {
    c.status = 'done'
    c.finishedAt = now
    c.assignedBarberId = null
  } else {
    return { error: 'final_status' }
  }
  return { spot: c }
}

function devToggleBreak(barberId) {
  const b = store.barbers.find((x) => x.id === barberId)
  if (!b) return { error: 'not_found' }
  b.onBreak = !b.onBreak
  return { barber: b }
}

module.exports = {
  isJoiningOpen,
  estimateWait,
  join,
  cancel,
  findCustomer,
  findActiveByPhone,
  spotView,
  publicView,
  devAdvance,
  devToggleBreak,
}
