// API base comes from VITE_API_URL (Heroku URL in production). Empty = same origin (dev proxy in vite.config.js).
const BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')

const PIN_KEY = 'salon-staff-pin'

export function getStaffPin() {
  try {
    return sessionStorage.getItem(PIN_KEY) || ''
  } catch {
    return ''
  }
}
export function setStaffPin(pin) {
  try {
    sessionStorage.setItem(PIN_KEY, pin)
  } catch {
    /* ignore */
  }
}
export function clearStaffPin() {
  try {
    sessionStorage.removeItem(PIN_KEY)
  } catch {
    /* ignore */
  }
}

// options.staff = true sends the staff PIN header.
export async function api(path, { staff = false, ...options } = {}) {
  const res = await fetch(BASE + path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(staff ? { 'x-staff-pin': getStaffPin() } : {}),
      ...(options.headers || {}),
    },
  })
  let body = null
  try {
    body = await res.json()
  } catch {
    /* no body */
  }
  if (!res.ok) {
    const err = new Error(body?.error || `http_${res.status}`)
    err.status = res.status
    err.code = body?.error
    throw err
  }
  return body
}

export const postJson = (path, data, options) =>
  api(path, { method: 'POST', body: JSON.stringify(data ?? {}), ...options })
