// Automated checks for docs/03-flows-rules.md. Run: npm test (in server/)
const { describe, it, beforeEach, after } = require('node:test')
const assert = require('node:assert/strict')

delete process.env.IGNORE_HOURS
delete process.env.NOSHOW_MINUTES
process.env.STAFF_PIN = '2468'

const store = require('../store')
const rules = require('../queueRules')

// 2026-11-18 06:00 UTC = 11:30 IST: salon open, well before the 8:30 PM cutoff.
const T0 = Date.UTC(2026, 10, 18, 6, 0)
let now
const minutes = (n) => n * 60000

beforeEach(() => {
  store.reset()
  now = T0
  rules.__setClock(() => now)
})
after(() => rules.__setClock(null))

let phoneSeq
beforeEach(() => {
  phoneSeq = 0
})
const nextPhone = () => String(9000000000 + ++phoneSeq)

function join(name, barberId = 'any', serviceIds = ['haircut'], opts) {
  const result = rules.join({ name, phone: nextPhone(), serviceIds, barberId }, opts)
  assert.ok(result.spot, `join ${name} failed: ${result.error}`)
  return result.spot
}
const status = (c) => rules.findCustomer(c.id).status
const view = (c) => rules.spotView(rules.findCustomer(c.id))

// Puts all 3 barbers in the chair (Ravi, Amit, Imran) so later joiners must wait.
function fillBarbers() {
  const a = join('Asha ' + 'R')
  const b = join('Bela ' + 'A')
  const c = join('Chirag I')
  for (const id of ['ravi', 'amit', 'imran']) rules.barberStart(id)
  return [a, b, c]
}

describe('joining', () => {
  it('2 services: correct total time and price', () => {
    const c = join('Asha', 'any', ['haircut', 'beard'])
    assert.equal(view(c).totalMinutes, 45)
    assert.equal(view(c).totalPrice, 230)
  })

  it('same phone twice returns the existing spot, no duplicate', () => {
    const first = rules.join({ name: 'Asha', phone: '9000000001', serviceIds: ['haircut'], barberId: 'any' })
    const again = rules.join({ name: 'Asha', phone: '9000000001', serviceIds: ['shave'], barberId: 'any' })
    assert.equal(again.existing, true)
    assert.equal(again.spot.id, first.spot.id)
    assert.equal(store.customers.length, 1)
  })

  it('rejects 4 services, short phone, short name, unknown barber', () => {
    const base = { name: 'Asha', phone: '9000000001', serviceIds: ['haircut'], barberId: 'any' }
    assert.equal(rules.join({ ...base, serviceIds: ['haircut', 'beard', 'spa', 'shave'] }).error, 'invalid_services')
    assert.equal(rules.join({ ...base, phone: '900' }).error, 'invalid_phone')
    assert.equal(rules.join({ ...base, name: 'A' }).error, 'invalid_name')
    assert.equal(rules.join({ ...base, barberId: 'zed' }).error, 'invalid_barber')
  })

  it('tokens increase and are never reused', () => {
    const a = join('Asha')
    rules.cancel(a.id)
    const b = join('Bela')
    assert.equal(a.id, 'S-1')
    assert.equal(b.id, 'S-2')
  })

  it('a phone can join again after cancelling', () => {
    const phone = '9000000009'
    const first = rules.join({ name: 'Asha', phone, serviceIds: ['haircut'], barberId: 'any' })
    rules.cancel(first.spot.id)
    const second = rules.join({ name: 'Asha', phone, serviceIds: ['haircut'], barberId: 'any' })
    assert.equal(second.existing, false)
    assert.notEqual(second.spot.id, first.spot.id)
  })
})

describe('online joining cutoff (rule 10)', () => {
  it('open at 8:29 PM IST, closed at 8:30 PM IST', () => {
    now = Date.UTC(2026, 10, 18, 14, 59) // 20:29 IST
    assert.equal(rules.isJoiningOpen(), true)
    now = Date.UTC(2026, 10, 18, 15, 0) // 20:30 IST
    assert.equal(rules.isJoiningOpen(), false)
    assert.equal(rules.join({ name: 'Asha', phone: '9000000001', serviceIds: ['haircut'], barberId: 'any' }).error, 'closed')
  })

  it('walk-ins still allowed after the cutoff', () => {
    now = Date.UTC(2026, 10, 18, 15, 30)
    const result = rules.join(
      { name: 'Walk In', phone: '9000000002', serviceIds: ['haircut'], barberId: 'any' },
      { walkIn: true },
    )
    assert.ok(result.spot)
  })

  it('owner closing the queue disables online joining but not walk-ins', () => {
    rules.setQueueOpen(false)
    assert.equal(rules.publicView().settings.joiningOpen, false)
    assert.equal(rules.join({ name: 'Asha', phone: '9000000001', serviceIds: ['haircut'], barberId: 'any' }).error, 'closed')
    assert.ok(rules.join({ name: 'Asha', phone: '9000000001', serviceIds: ['haircut'], barberId: 'any' }, { walkIn: true }).spot)
  })
})

describe('calling customers (rules 3, 3a, 4)', () => {
  it('a customer joining while a barber is free is called immediately', () => {
    const c = join('Asha')
    assert.equal(status(c), 'called')
    assert.ok(view(c).calledBarberName)
  })

  it('manual call next skips customers who chose another barber', () => {
    const [, bela] = fillBarbers() // Ravi, Amit, Imran all in chair
    const forRavi = join('Dhruv', 'ravi')
    const anyone = join('Esha', 'any')
    // Free Amit without triggering auto-call, to exercise the manual override.
    store.customers.find((c) => c.id === bela.id).status = 'done'
    store.customers.find((c) => c.id === bela.id).assignedBarberId = null
    const result = rules.callNext('amit')
    assert.equal(result.spot.id, anyone.id)
    assert.equal(status(forRavi), 'waiting')
  })

  it('after Done the earliest eligible waiting customer is auto-called', () => {
    fillBarbers()
    const forAmit = join('Dhruv', 'amit')
    const anyone = join('Esha', 'any')
    rules.barberDone('amit')
    assert.equal(status(forAmit), 'called') // earliest of the eligible two
    assert.equal(status(anyone), 'waiting')
    assert.equal(view(forAmit).calledBarberName, 'Amit')
  })

  it('a customer who chose Ravi is never given another barber', () => {
    fillBarbers()
    const forRavi = join('Dhruv', 'ravi')
    rules.barberDone('amit')
    rules.barberDone('imran')
    assert.equal(status(forRavi), 'waiting')
    rules.barberDone('ravi')
    assert.equal(status(forRavi), 'called')
    assert.equal(view(forRavi).calledBarberName, 'Ravi')
  })

  it('a barber has only one customer at a time', () => {
    const [a] = fillBarbers()
    assert.equal(rules.callNext('ravi').error, 'barber_busy')
    assert.equal(status(a), 'in_chair')
  })
})

describe('barber actions and break (rule 11)', () => {
  it('Start then Done update the customer; invalid transitions are rejected', () => {
    const c = join('Asha', 'ravi')
    assert.equal(rules.barberDone('ravi').error, 'nothing_to_finish')
    assert.equal(rules.barberStart('ravi').spot.id, c.id)
    assert.equal(status(c), 'in_chair')
    assert.equal(rules.barberStart('ravi').error, 'nothing_to_start')
    assert.equal(rules.barberDone('ravi').spot.id, c.id)
    assert.equal(status(c), 'done')
  })

  it('cannot go on break with a customer called or in the chair', () => {
    const c = join('Asha', 'ravi')
    assert.equal(rules.setBreak('ravi', true).error, 'finish_first')
    rules.barberStart('ravi')
    assert.equal(rules.setBreak('ravi', true).error, 'finish_first')
    rules.barberDone('ravi')
    assert.ok(rules.setBreak('ravi', true).barber.onBreak)
    assert.equal(status(c), 'done')
  })

  it('a barber on break is never auto-called; back from break -> auto-called', () => {
    rules.setBreak('ravi', true)
    const c = join('Asha', 'ravi')
    assert.equal(status(c), 'waiting')
    assert.equal(view(c).barberOnBreak, true)
    rules.setBreak('ravi', false)
    assert.equal(status(c), 'called')
  })

  it('Any customers are unaffected by one barber being on break', () => {
    rules.setBreak('ravi', true)
    const c = join('Asha', 'any')
    assert.equal(status(c), 'called')
    assert.notEqual(view(c).calledBarberName, 'Ravi')
  })
})

describe('no-show and cancel (rules 8, 9)', () => {
  it('no-show only after 10 minutes, then re-adding gives a new token at the end', () => {
    const phone = '9111111111' // not one of the numbers nextPhone() generates
    const first = rules.join({ name: 'Asha', phone, serviceIds: ['haircut'], barberId: 'any' }).spot
    assert.equal(status(first), 'called')
    assert.equal(rules.noShow(first.id).error, 'too_early')
    now += minutes(10)
    assert.equal(rules.noShow(first.id).spot.status, 'no_show')
    assert.equal(rules.noShow(first.id).error, 'not_called')

    const waiting = join('Bela', 'ravi') // others in the queue meanwhile
    const again = rules.join({ name: 'Asha', phone, serviceIds: ['haircut'], barberId: 'any' })
    assert.equal(again.existing, false)
    assert.ok(again.spot.number > first.number)
    assert.ok(again.spot.number > waiting.number)
  })

  it('only called customers can be marked no-show', () => {
    fillBarbers()
    const waiting = join('Dhruv')
    now += minutes(30)
    assert.equal(rules.noShow(waiting.id).error, 'not_called')
  })

  it('cancelling a waiting customer moves everyone behind them up', () => {
    fillBarbers()
    const a = join('Dhruv')
    const b = join('Esha')
    const c = join('Farid')
    assert.equal(view(c).position, 3)
    rules.cancel(a.id)
    assert.equal(view(b).position, 1)
    assert.equal(view(c).position, 2)
  })

  it('cancelling a called customer frees the barber for the next in line', () => {
    const first = join('Asha', 'ravi')
    const next = join('Bela', 'ravi')
    assert.equal(status(next), 'waiting')
    rules.cancel(first.id)
    assert.equal(status(first), 'cancelled')
    assert.equal(status(next), 'called')
  })

  it('final statuses cannot change', () => {
    const c = join('Asha')
    rules.cancel(c.id)
    assert.equal(rules.cancel(c.id).error, 'not_cancellable')
    assert.equal(rules.barberStart('ravi').error, 'nothing_to_start')
  })
})

describe('waiting time (rule 5)', () => {
  it('an empty salon means no wait', () => {
    assert.equal(rules.publicView().waits.any, 0)
  })

  it('falls as customers progress and finish', () => {
    fillBarbers() // 3 x 30 min in chair
    const c = join('Dhruv')
    assert.equal(view(c).position, 1)
    assert.equal(view(c).waitMinutes, 30)
    now += minutes(15)
    assert.equal(view(c).waitMinutes, 15)
    rules.barberDone('ravi')
    assert.equal(status(c), 'called') // a chair freed up, so no more waiting
  })

  it('estimate is divided between working barbers and rounded up to 5 min', () => {
    fillBarbers()
    join('Dhruv', 'any', ['beard']) // 15 min waiting
    const c = join('Esha', 'any', ['haircut'])
    // ahead = 3x30 in chair + 15 waiting = 105 min / 3 barbers = 35
    assert.equal(view(c).waitMinutes, 35)
  })

  it('a specific barber is estimated alone', () => {
    fillBarbers()
    join('Dhruv', 'ravi', ['spa']) // 45 min for Ravi
    const c = join('Esha', 'ravi', ['haircut'])
    // Ravi: 30 in chair + 45 ahead = 75 for one barber
    assert.equal(view(c).waitMinutes, 75)
  })

  it('no estimate when the chosen barber is on break or off duty', () => {
    rules.setBreak('ravi', true)
    const c = join('Asha', 'ravi')
    assert.equal(view(c).waitMinutes, null)
    rules.setBreak('ravi', false)
    rules.barberStart('ravi')
    rules.barberDone('ravi')
    rules.setBarberDuty('ravi', false)
    assert.equal(rules.publicView().waits.ravi, null)
  })
})

describe('2nd in line and reception highlight', () => {
  it('positions count only waiting customers', () => {
    fillBarbers()
    const a = join('Dhruv')
    const b = join('Esha')
    assert.equal(view(a).position, 1)
    assert.equal(view(b).position, 2)
  })

  it('reception shows waiting minutes so rows over 60 can be highlighted', () => {
    fillBarbers()
    join('Dhruv')
    now += minutes(61)
    const row = rules.receptionView().queue.find((q) => q.name === 'Dhruv')
    assert.ok(row.waitedMinutes > 60)
  })

  it('no-show is offered only for called rows after the delay', () => {
    const c = join('Asha')
    assert.equal(rules.receptionView().queue[0].canNoShow, false)
    now += minutes(11)
    assert.equal(rules.receptionView().queue.find((q) => q.id === c.id).canNoShow, true)
  })
})

describe('owner settings (rules 12, 16-18)', () => {
  it('a service turned off disappears from Join but stays for people already queued', () => {
    const c = join('Asha', 'any', ['beard'])
    rules.updateService('beard', { on: false })
    assert.ok(!rules.publicView().services.some((s) => s.id === 'beard'))
    assert.equal(rules.join({ name: 'Bela', phone: '9000000099', serviceIds: ['beard'], barberId: 'any' }).error, 'invalid_services')
    assert.equal(view(c).services[0].id, 'beard')
  })

  it('editing minutes and price changes totals', () => {
    rules.updateService('haircut', { minutes: 40, price: 200 })
    const c = join('Asha')
    assert.equal(view(c).totalMinutes, 40)
    assert.equal(view(c).totalPrice, 200)
  })

  it('added service appears on Join', () => {
    rules.addService({ name: { en: 'Head massage', gu: 'હેડ મસાજ' }, minutes: 20, price: 120 })
    assert.ok(rules.publicView().services.some((s) => s.id === 'head-massage'))
  })

  it('rejects invalid minutes, price and names', () => {
    const ok = { name: { en: 'X', gu: 'એક્સ' }, minutes: 10, price: 10 }
    assert.equal(rules.addService({ ...ok, minutes: 3 }).error, 'invalid_minutes')
    assert.equal(rules.addService({ ...ok, minutes: 181 }).error, 'invalid_minutes')
    assert.equal(rules.addService({ ...ok, price: 6000 }).error, 'invalid_price')
    assert.equal(rules.addService({ ...ok, price: -1 }).error, 'invalid_price')
    assert.equal(rules.addService({ ...ok, name: { en: 'X', gu: '' } }).error, 'invalid_name')
    assert.equal(rules.updateService('haircut', { minutes: 2 }).error, 'invalid_minutes')
  })

  it('barber off duty: blocked with a customer, not selectable, never called, back on -> auto-called', () => {
    const c = join('Asha', 'ravi')
    assert.equal(rules.setBarberDuty('ravi', false).error, 'finish_first')
    rules.barberStart('ravi')
    rules.barberDone('ravi')
    assert.deepEqual(rules.setBarberDuty('ravi', false), {})
    assert.equal(rules.join({ name: 'Bela', phone: '9000000050', serviceIds: ['haircut'], barberId: 'ravi' }).error, 'invalid_barber')
    assert.equal(rules.setBreak('ravi', true).error, 'off_duty')
    assert.equal(status(c), 'done')

    // A customer already waiting for Ravi when he goes off duty keeps their spot.
    rules.setBarberDuty('ravi', true)
    rules.setBreak('ravi', true)
    const waiting = join('Esha', 'ravi')
    rules.setBarberDuty('ravi', false)
    assert.equal(status(waiting), 'waiting')
    assert.equal(view(waiting).barberOffDuty, true)
    rules.setBarberDuty('ravi', true)
    assert.equal(status(waiting), 'called')
  })

  it("today's stats: served, no-shows and average wait; empty = 0 / null", () => {
    assert.deepEqual(rules.adminView().stats, { served: 0, noShows: 0, averageWait: null })
    const a = join('Asha', 'ravi')
    rules.barberStart('ravi')
    rules.barberDone('ravi')
    now += minutes(5)
    const b = join('Bela', 'ravi') // called straight away: 0 min wait
    now += minutes(10)
    rules.noShow(b.id)
    const stats = rules.adminView().stats
    assert.equal(stats.served, 1)
    assert.equal(stats.noShows, 1)
    assert.equal(stats.averageWait, 0)
    assert.equal(status(a), 'done')
  })

  it('stats count only today (IST calendar day)', () => {
    const c = join('Asha', 'ravi')
    rules.barberStart('ravi')
    rules.barberDone('ravi')
    now += minutes(24 * 60) // tomorrow
    assert.equal(rules.adminView().stats.served, 0)
    assert.equal(status(c), 'done')
  })
})

describe('staff PIN (rule 15) and public TV feed', () => {
  it('checks the PIN', () => {
    assert.equal(rules.checkPin('2468'), true)
    assert.equal(rules.checkPin('1111'), false)
    assert.equal(rules.checkPin(undefined), false)
  })

  it('TV feed exposes tokens and barber names only', () => {
    fillBarbers()
    join('Dhruv Private')
    const text = JSON.stringify(rules.displayView())
    assert.ok(!text.includes('Dhruv'))
    assert.ok(!text.includes('9000000'))
    assert.equal(rules.displayView().upNext.length, 1)
  })

  it('TV shows at most the next 5 waiting tokens', () => {
    fillBarbers()
    for (let i = 0; i < 7; i++) join(`Cust ${i}`)
    assert.equal(rules.displayView().upNext.length, 5)
  })
})
