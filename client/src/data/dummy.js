// TEMPORARY dummy data for Step 2. Replaced by server API data in Step 3+.
// Queue rules (wait estimate etc.) must move to server/queueRules.js; the numbers below are fake.

export const DUMMY_SERVICES = [
  { id: 'haircut', name: { en: 'Haircut', gu: 'હેરકટ' }, minutes: 30, price: 150, on: true },
  { id: 'beard', name: { en: 'Beard trim', gu: 'દાઢી ટ્રીમ' }, minutes: 15, price: 80, on: true },
  { id: 'spa', name: { en: 'Hair spa', gu: 'હેર સ્પા' }, minutes: 45, price: 400, on: true },
  { id: 'shave', name: { en: 'Shave', gu: 'શેવ' }, minutes: 20, price: 100, on: true },
  { id: 'facial', name: { en: 'Facial', gu: 'ફેશિયલ' }, minutes: 40, price: 350, on: true },
]

// status: 'busy' | 'free' | 'break'
export const DUMMY_BARBERS = [
  { id: 'ravi', name: 'Ravi', status: 'busy' },
  { id: 'amit', name: 'Amit', status: 'free' },
  { id: 'imran', name: 'Imran', status: 'break' },
]

export const DUMMY_QUEUE = { waiting: 6, waitMinutes: 50 }

// Fake per-barber wait (minutes) until your turn. 'any' = fastest.
export const DUMMY_WAIT = { any: 35, ravi: 45, amit: 35, imran: 60 }

export const DUMMY_SETTINGS = {
  queueOpen: true,
  closesAt: '21:00',
  closesLabel: '9 PM',
  cutoffMinutes: 30,
}

// True while online joining is allowed (owner switch + 30 min before closing).
export function isJoiningOpen(settings = DUMMY_SETTINGS, now = new Date()) {
  if (!settings.queueOpen) return false
  const [h, m] = settings.closesAt.split(':').map(Number)
  const cutoff = new Date(now)
  cutoff.setHours(h, m - settings.cutoffMinutes, 0, 0)
  return now < cutoff
}
