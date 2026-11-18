// TEMPORARY: remembers joined spots in this browser until the server exists (Step 3).
const KEY = 'salon-dummy-spots'

function read() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || []
  } catch {
    return []
  }
}

export function findSpotByPhone(phone) {
  return read().find((s) => s.phone === phone) || null
}

export function saveSpot(spot) {
  const all = read()
  const next = { ...spot, id: `S-${all.length + 15}` } // dummy token numbers start at S-15
  try {
    localStorage.setItem(KEY, JSON.stringify([...all, next]))
  } catch {
    /* ignore */
  }
  return next
}
