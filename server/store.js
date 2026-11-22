// In-memory data store (resets on restart). Plain data only; all logic is in queueRules.js.

function createState() {
  return {
    settings: {
      queueOpen: true,
      closesAt: '21:00', // salon local time (Asia/Kolkata)
      closesLabel: '9 PM',
      cutoffMinutes: 30, // online joining closes this long before closing
    },
    services: [
      { id: 'haircut', name: { en: 'Haircut', gu: 'હેરકટ' }, minutes: 30, price: 150, on: true },
      { id: 'beard', name: { en: 'Beard trim', gu: 'દાઢી ટ્રીમ' }, minutes: 15, price: 80, on: true },
      { id: 'spa', name: { en: 'Hair spa', gu: 'હેર સ્પા' }, minutes: 45, price: 400, on: true },
      { id: 'shave', name: { en: 'Shave', gu: 'શેવ' }, minutes: 20, price: 100, on: true },
      { id: 'facial', name: { en: 'Facial', gu: 'ફેશિયલ' }, minutes: 40, price: 350, on: true },
    ],
    barbers: [
      { id: 'ravi', name: 'Ravi', onDuty: true, onBreak: false },
      { id: 'amit', name: 'Amit', onDuty: true, onBreak: false },
      { id: 'imran', name: 'Imran', onDuty: true, onBreak: false },
    ],
    // customer: { number, id:'S-<number>', name, phone, serviceIds, barberId:'any'|id,
    //   status:'waiting'|'called'|'in_chair'|'done'|'cancelled'|'no_show',
    //   assignedBarberId, joinedAt, calledAt, startedAt, finishedAt }
    customers: [],
    nextToken: 1,
  }
}

const state = createState()

// Restores the seed data in place (used by the automated tests).
Object.defineProperty(state, 'reset', {
  enumerable: false,
  value: () => Object.assign(state, createState()),
})

module.exports = state
