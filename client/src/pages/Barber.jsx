import { useEffect, useRef, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useT } from '../i18n/index.jsx'
import { clearStaffPin, postJson } from '../api.js'
import { usePolling } from '../usePolling.js'
import StaffGate from '../components/StaffGate.jsx'

function formatTimer(totalSeconds) {
  const m = Math.floor(totalSeconds / 60)
  const s = totalSeconds % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function Panel() {
  const { name } = useParams()
  const barberId = name.toLowerCase()
  const { t, lang } = useT()
  const { data, error, reload } = usePolling(`/api/barber/${encodeURIComponent(barberId)}`, { staff: true })
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')

  // Timer: server's elapsed seconds at fetch time + seconds since we received it.
  const receivedAt = useRef(Date.now())
  const [, setTick] = useState(0)
  useEffect(() => {
    receivedAt.current = Date.now()
  }, [data])
  useEffect(() => {
    const timer = setInterval(() => setTick((n) => n + 1), 1000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    if (error?.status === 401) {
      clearStaffPin()
      window.location.reload()
    }
  }, [error])

  async function act(action, body) {
    setBusy(true)
    setMessage('')
    try {
      await postJson(`/api/barber/${encodeURIComponent(barberId)}/${action}`, body, { staff: true })
    } catch (err) {
      const known = ['finish_first', 'nothing_to_start', 'nothing_to_finish', 'off_duty']
      setMessage(known.includes(err.code) ? t(`barber.err.${err.code}`) : t('barber.err.generic'))
    }
    setBusy(false)
    reload()
  }

  if (!data) {
    if (error?.status === 404) {
      return (
        <div className="max-w-md mx-auto rounded-card bg-charcoal-light p-6 text-center space-y-4">
          <p>{t('barber.notFound')}</p>
          <Link to="/" className="inline-block min-h-11 leading-11 text-gold underline">
            {t('common.backHome')}
          </Link>
        </div>
      )
    }
    return (
      <p className="text-center text-gray-300 mt-10">
        {error ? t('common.serverError') : t('common.loading')}
      </p>
    )
  }

  const { current, next } = data
  const onBreak = data.onBreak
  const elapsed = current?.status === 'in_chair'
    ? current.elapsedSeconds + Math.floor((Date.now() - receivedAt.current) / 1000)
    : 0

  return (
    <div className="max-w-md mx-auto space-y-5">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-gold">{data.name}</h1>
        <button
          type="button"
          role="switch"
          aria-checked={!onBreak}
          onClick={() => act('break', { onBreak: !onBreak })}
          disabled={busy || !data.onDuty}
          className={`min-h-12 rounded-full px-5 font-semibold border-2 disabled:opacity-50 ${
            onBreak
              ? 'border-gray-400 bg-gray-500/20 text-gray-200'
              : 'border-emerald-400 bg-emerald-500/20 text-emerald-300'
          }`}
        >
          {onBreak ? t('barber.onBreak') : t('barber.available')}
        </button>
      </div>

      {!data.onDuty && (
        <p className="rounded-xl bg-amber-500/15 border border-amber-500/40 p-3 text-sm text-amber-300">
          {t('barber.offDuty')}
        </p>
      )}
      {error && <p className="text-xs text-amber-300">{t('common.serverError')}</p>}
      {message && (
        <p role="alert" className="rounded-xl bg-red-500/15 border border-red-500/40 p-3 text-sm text-red-300">
          {message}
        </p>
      )}

      <section className="rounded-card bg-charcoal-light p-5 border border-gold/30 space-y-3">
        <h2 className="text-sm uppercase tracking-wide text-gray-400">{t('barber.current')}</h2>
        {current ? (
          <>
            <div className="text-4xl font-extrabold text-gold">{current.id}</div>
            <div className="text-lg font-semibold">{current.name}</div>
            <div className="text-sm text-gray-300">
              {current.services.map((s) => s?.[lang]).join(', ')} · {current.totalMinutes} {t('common.min')}
            </div>
            {current.status === 'in_chair' ? (
              <div className="text-3xl font-mono tabular-nums" aria-label={t('barber.timer')}>
                {formatTimer(elapsed)}
              </div>
            ) : (
              <p className="text-amber-300">{t('barber.calledWaiting')}</p>
            )}
          </>
        ) : (
          <p className="text-gray-300">{t('barber.noCustomer')}</p>
        )}
      </section>

      {current?.status === 'called' && (
        <button
          type="button"
          onClick={() => act('start')}
          disabled={busy}
          className="w-full min-h-20 rounded-2xl bg-gold text-3xl font-extrabold text-charcoal-dark disabled:opacity-50"
        >
          {t('barber.start')}
        </button>
      )}
      {current?.status === 'in_chair' && (
        <button
          type="button"
          onClick={() => act('done')}
          disabled={busy}
          className="w-full min-h-20 rounded-2xl bg-emerald-500 text-3xl font-extrabold text-charcoal-dark disabled:opacity-50"
        >
          {t('barber.done')}
        </button>
      )}

      <p className="rounded-card bg-charcoal-light p-4 text-center text-sm">
        {next ? (
          <>
            <span className="text-gray-300">{t('barber.nextFor')}: </span>
            <b>
              {next.id} {next.name}
            </b>{' '}
            ({next.services.map((s) => s?.[lang]).join(', ')})
          </>
        ) : (
          <span className="text-gray-300">{t('barber.noNext')}</span>
        )}
      </p>
    </div>
  )
}

export default function Barber() {
  return (
    <StaffGate>
      <Panel />
    </StaffGate>
  )
}
