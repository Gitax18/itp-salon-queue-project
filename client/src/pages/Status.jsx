import { useEffect, useRef, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'
import { ordinal, useT } from '../i18n/index.jsx'
import { postJson } from '../api.js'
import { usePolling } from '../usePolling.js'

const RADIUS = 54
const CIRC = 2 * Math.PI * RADIUS

function WaitRing({ minutes, start }) {
  const { t } = useT()
  const progress = start > 0 ? Math.max(0, Math.min(1, minutes / start)) : 0
  return (
    <div className="relative mx-auto h-40 w-40">
      <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90" aria-hidden="true">
        <circle cx="60" cy="60" r={RADIUS} fill="none" stroke="#374151" strokeWidth="10" />
        <circle
          cx="60"
          cy="60"
          r={RADIUS}
          fill="none"
          stroke="#D4A017"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={CIRC}
          strokeDashoffset={CIRC * (1 - progress)}
          style={{ transition: 'stroke-dashoffset 0.6s ease' }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <div className="text-xs text-gray-300">{t('home.about')}</div>
          <div className="text-4xl font-bold text-gold">{minutes}</div>
          <div className="text-xs text-gray-300">{t('common.min')}</div>
        </div>
      </div>
    </div>
  )
}

function ConfirmCancel({ onYes, onKeep, busy, error }) {
  const { t } = useT()
  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[60] grid place-items-center bg-black/70 p-4"
    >
      <div className="w-full max-w-sm rounded-card bg-charcoal p-6 space-y-4 border border-gold/40">
        <h2 className="text-xl font-bold">{t('status.cancelTitle')}</h2>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={onYes}
            disabled={busy}
            className="min-h-12 rounded-xl bg-red-500 font-semibold text-white disabled:opacity-50"
          >
            {t('status.cancelYes')}
          </button>
          <button
            type="button"
            onClick={onKeep}
            className="min-h-12 rounded-xl bg-gold font-semibold text-charcoal-dark"
          >
            {t('status.cancelKeep')}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Status() {
  const { id } = useParams()
  const { state: navState } = useLocation()
  const { t, lang } = useT()
  const { data: spot, error, reload } = usePolling(`/api/spots/${id}`)
  const [askCancel, setAskCancel] = useState(false)
  const [cancelBusy, setCancelBusy] = useState(false)
  const [cancelError, setCancelError] = useState('')
  const startWait = useRef(0)

  // Remember the first wait we saw: the ring shows remaining / first.
  if (spot?.status === 'waiting' && spot.waitMinutes != null) {
    startWait.current = Math.max(startWait.current, spot.waitMinutes)
  }

  const status = spot?.status
  useEffect(() => {
    if (status === 'called') {
      try {
        navigator.vibrate?.([300, 150, 300, 150, 300])
      } catch {
        /* not supported */
      }
    }
  }, [status])

  async function doCancel() {
    setCancelBusy(true)
    setCancelError('')
    try {
      await postJson(`/api/spots/${id}/cancel`)
      setAskCancel(false)
      reload()
    } catch {
      setCancelError(t('status.cancelError'))
    }
    setCancelBusy(false)
  }

  if (!spot) {
    if (error?.status === 404) {
      return (
        <div className="max-w-md mx-auto rounded-card bg-charcoal-light p-6 text-center space-y-4">
          <p>{t('status.notFound')}</p>
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

  const cancelDialog = askCancel && (
    <ConfirmCancel
      onYes={doCancel}
      onKeep={() => setAskCancel(false)}
      busy={cancelBusy}
      error={cancelError}
    />
  )

  // Called: full-screen gold "It's your turn!"
  if (spot.status === 'called') {
    return (
      <>
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-5 bg-gold p-6 text-center text-charcoal-dark animate-pulse">
          <div className="text-6xl font-extrabold">{spot.id}</div>
          <h1 className="text-4xl font-extrabold">{t('status.yourTurn')}</h1>
          <p className="text-3xl font-bold">
            {t('status.goTo', { barber: spot.calledBarberName })}
          </p>
          <p className="text-lg">{t('status.arriveWithin')}</p>
          <button
            type="button"
            onClick={() => setAskCancel(true)}
            className="mt-4 min-h-12 rounded-xl border-2 border-charcoal-dark px-6 font-semibold"
          >
            {t('status.cancel')}
          </button>
        </div>
        {cancelDialog}
      </>
    )
  }

  const FINAL = {
    in_chair: { key: 'status.inChair', tone: 'text-gold' },
    done: { key: 'status.done', tone: 'text-emerald-300' },
    cancelled: { key: 'status.cancelled', tone: 'text-gray-300' },
    no_show: { key: 'status.noShow', tone: 'text-amber-300' },
  }
  if (FINAL[spot.status]) {
    const { key, tone } = FINAL[spot.status]
    const again = spot.status === 'cancelled' || spot.status === 'no_show'
    return (
      <div className="max-w-md mx-auto rounded-card bg-charcoal-light p-8 text-center space-y-5">
        <div className="text-3xl font-bold text-gold">{spot.id}</div>
        <p className={`text-2xl font-semibold ${tone}`}>{t(key)}</p>
        {spot.status !== 'in_chair' && (
          <Link
            to={again ? '/join' : '/'}
            className="inline-block min-h-12 leading-12 rounded-xl bg-gold px-6 font-semibold text-charcoal-dark"
          >
            {again ? t('status.joinAgain') : t('common.backHome')}
          </Link>
        )}
      </div>
    )
  }

  // Waiting
  const barberLabel = spot.barberName ?? t('join.anyBarber')
  return (
    <div className="max-w-md mx-auto space-y-5">
      {navState?.alreadyInQueue && (
        <p className="rounded-xl bg-gold/15 border border-gold/40 p-3 text-center text-sm text-gold">
          {t('status.alreadyInQueue')}
        </p>
      )}

      {spot.position > 0 && spot.position <= 2 && (
        <p className="rounded-xl bg-gold text-charcoal-dark p-3 text-center font-bold">
          {t('status.startComing')}
        </p>
      )}

      <div className="rounded-card bg-charcoal-light p-6 text-center border border-gold/30 space-y-3">
        <div className="text-sm text-gray-300">{t('status.yourToken')}</div>
        <div className="text-6xl font-extrabold text-gold">{spot.id}</div>
        <div className="text-lg">
          {t('status.position', { ord: ordinal(spot.position), n: spot.position })}
        </div>
      </div>

      {spot.waitMinutes == null ? (
        <p className="rounded-xl bg-charcoal-light p-4 text-center text-amber-300">
          {t('status.noBarber')}
        </p>
      ) : (
        <WaitRing minutes={spot.waitMinutes} start={startWait.current} />
      )}

      {spot.barberOnBreak && (
        <p className="rounded-xl bg-amber-500/15 border border-amber-500/40 p-3 text-center text-sm text-amber-300">
          {t('status.onBreak', { barber: spot.barberName })}
        </p>
      )}

      <div className="rounded-card bg-charcoal-light p-4 space-y-2 text-sm">
        <div className="font-semibold text-base">{spot.name}</div>
        <div className="text-gray-300">{t('status.services')}</div>
        <ul className="space-y-1">
          {spot.services.map((s) => (
            <li key={s.id} className="flex justify-between">
              <span>
                {s.name[lang]} · {s.minutes} {t('common.min')}
              </span>
              <span>₹{s.price}</span>
            </li>
          ))}
        </ul>
        <div className="flex justify-between border-t border-charcoal pt-2 font-bold">
          <span>
            {t('status.total')} · {spot.totalMinutes} {t('common.min')}
          </span>
          <span>₹{spot.totalPrice}</span>
        </div>
        <div className="text-gray-300">
          {t('status.barber')}: <span className="text-white">{barberLabel}</span>
        </div>
      </div>

      <button
        type="button"
        onClick={() => setAskCancel(true)}
        className="w-full min-h-12 rounded-xl border border-red-400/60 font-semibold text-red-300"
      >
        {t('status.cancel')}
      </button>
      {cancelDialog}
    </div>
  )
}
