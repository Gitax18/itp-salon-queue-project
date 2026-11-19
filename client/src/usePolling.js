import { useCallback, useEffect, useState } from 'react'
import { api } from './api.js'

// Fetches `path` now and every `intervalMs` (default 3 s). Keeps last good data on errors.
export function usePolling(path, { intervalMs = 3000, staff = false } = {}) {
  const [state, setState] = useState({ data: null, error: null, loading: true })
  const [nonce, setNonce] = useState(0)

  useEffect(() => {
    let stopped = false
    let timer
    async function tick() {
      try {
        const data = await api(path, { staff })
        if (!stopped) setState({ data, error: null, loading: false })
      } catch (error) {
        if (!stopped) setState((s) => ({ data: s.data, error, loading: false }))
      }
      if (!stopped) timer = setTimeout(tick, intervalMs)
    }
    tick()
    return () => {
      stopped = true
      clearTimeout(timer)
    }
  }, [path, intervalMs, staff, nonce])

  const reload = useCallback(() => setNonce((n) => n + 1), [])
  return { ...state, reload }
}
