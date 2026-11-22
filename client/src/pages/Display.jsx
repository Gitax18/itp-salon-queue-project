import { useEffect, useRef, useState } from 'react'
import { useT } from '../i18n/index.jsx'
import { usePolling } from '../usePolling.js'

const FLASH_MS = 8000

// Short two-note chime using the Web Audio API (no audio file needed).
function playChime(ctx) {
  if (!ctx) return
  const now = ctx.currentTime
  ;[660, 880].forEach((freq, i) => {
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.value = freq
    gain.gain.setValueAtTime(0.0001, now + i * 0.25)
    gain.gain.exponentialRampToValueAtTime(0.4, now + i * 0.25 + 0.03)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.25 + 0.5)
    osc.connect(gain).connect(ctx.destination)
    osc.start(now + i * 0.25)
    osc.stop(now + i * 0.25 + 0.55)
  })
}

export default function Display() {
  const { t } = useT()
  const { data, error } = usePolling('/api/display')
  const [clock, setClock] = useState(() => new Date())
  const [flashing, setFlashing] = useState({}) // barberId -> expiry timestamp
  const [soundOn, setSoundOn] = useState(false)
  const audioRef = useRef(null)
  const prevTokens = useRef(null) // barberId -> token, null until first load

  useEffect(() => {
    const timer = setInterval(() => setClock(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  // Detect newly called tokens: flash gold + chime. The first load never chimes.
  useEffect(() => {
    if (!data) return
    const current = {}
    for (const b of data.barbers) current[b.id] = b.nowStatus === 'called' ? b.nowToken : null
    if (prevTokens.current) {
      const fresh = data.barbers.filter(
        (b) => current[b.id] && current[b.id] !== prevTokens.current[b.id],
      )
      if (fresh.length) {
        const until = Date.now() + FLASH_MS
        setFlashing((f) => ({ ...f, ...Object.fromEntries(fresh.map((b) => [b.id, until])) }))
        playChime(audioRef.current) // the 1 s clock tick re-renders, so the flash ends on time
      }
    }
    prevTokens.current = current
  }, [data])

  function enableSound() {
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext
      audioRef.current = audioRef.current || new Ctx()
      audioRef.current.resume?.()
      playChime(audioRef.current)
      setSoundOn(true)
    } catch {
      /* audio unavailable */
    }
  }

  if (!data) {
    return (
      <p className="text-center text-3xl text-gray-300 mt-20">
        {error ? t('common.serverError') : t('common.loading')}
      </p>
    )
  }

  const barbers = data.barbers.filter((b) => b.status !== 'off')
  const nowMs = clock.getTime()

  return (
    <div className="mx-auto max-w-6xl space-y-8 p-2">
      <div className="flex items-center justify-between gap-4">
        <div className="text-5xl font-bold tabular-nums">
          {clock.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </div>
        <span
          className={`rounded-full px-5 py-2 text-2xl font-semibold ${
            data.settings.queueOpen ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'
          }`}
        >
          {data.settings.queueOpen ? t('home.open') : t('home.closed')}
        </span>
        {!soundOn && (
          <button
            type="button"
            onClick={enableSound}
            className="min-h-11 rounded-xl border border-gold px-4 text-gold"
          >
            {t('display.enableSound')}
          </button>
        )}
      </div>

      <section className="space-y-4" aria-label={t('home.barbers')}>
        {barbers.map((b) => {
          const flash = (flashing[b.id] ?? 0) > nowMs
          const idle = !b.nowToken
          return (
            <div
              key={b.id}
              className={`flex items-center gap-6 rounded-card p-5 border-2 ${
                flash
                  ? 'bg-gold text-charcoal-dark border-gold animate-pulse'
                  : 'bg-charcoal-light border-charcoal-light'
              }`}
            >
              <span className="h-20 w-20 shrink-0 rounded-full grid place-items-center text-4xl font-bold bg-charcoal-dark text-gold">
                {b.name[0]}
              </span>
              <span className="flex-1 text-4xl font-semibold">{b.name}</span>
              <span className="text-right">
                {idle ? (
                  <span className="text-4xl text-gray-300">
                    {b.status === 'break' ? t('display.onBreak') : t('display.free')}
                  </span>
                ) : (
                  <>
                    <span className="block text-xl opacity-80">{t('display.now')}</span>
                    <span className="block text-6xl font-extrabold tabular-nums">{b.nowToken}</span>
                  </>
                )}
              </span>
            </div>
          )
        })}
      </section>

      <section aria-label={t('display.upNext')}>
        <h2 className="mb-3 text-3xl font-bold text-gold">{t('display.upNext')}</h2>
        {data.upNext.length === 0 ? (
          <p className="text-4xl text-gray-300">{t('display.nobody')}</p>
        ) : (
          <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
            {data.upNext.map((u) => (
              <li key={u.id} className="rounded-card bg-charcoal-light p-4 text-center">
                <div className="text-5xl font-extrabold tabular-nums">{u.id}</div>
                <div className="mt-1 text-2xl text-gray-300">
                  {u.waitMinutes == null ? '—' : `~${u.waitMinutes} ${t('common.min')}`}
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>
    </div>
  )
}
