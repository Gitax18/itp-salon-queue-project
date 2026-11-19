// API base comes from VITE_API_URL (Heroku URL in production). Empty = same origin (dev proxy in vite.config.js).
const BASE = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '')

export async function api(path, options = {}) {
  const res = await fetch(BASE + path, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
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

export const postJson = (path, data) =>
  api(path, { method: 'POST', body: JSON.stringify(data ?? {}) })
