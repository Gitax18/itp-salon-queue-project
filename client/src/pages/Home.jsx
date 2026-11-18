import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useT } from '../i18n/index.jsx'
import {
  DUMMY_BARBERS,
  DUMMY_QUEUE,
  DUMMY_SETTINGS,
  isJoiningOpen,
} from '../data/dummy.js'
import { findSpotByPhone } from '../data/localSpots.js'

const CHIP = {
  busy: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
  free: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
  break: 'bg-gray-500/20 text-gray-300 border-gray-500/40',
}

function AlreadyJoined() {
  const { t } = useT()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [phone, setPhone] = useState('')
  const [error, setError] = useState('')

  function submit(e) {
    e.preventDefault()
    const spot = findSpotByPhone(phone)
    if (spot) navigate(`/status/${spot.id}`)
    else setError(t('home.notFound'))
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="min-h-11 w-full text-center text-sm text-gold underline"
      >
        {t('home.alreadyJoined')}
      </button>
    )
  }
  return (
    <form onSubmit={submit} className="rounded-card bg-charcoal-light p-4 space-y-3">
      <label className="block text-sm text-gray-300" htmlFor="lookup-phone">
        {t('home.enterPhone')}
      </label>
      <input
        id="lookup-phone"
        inputMode="numeric"
        autoComplete="tel"
        value={phone}
        onChange={(e) => {
          setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))
          setError('')
        }}
        className="w-full min-h-11 rounded-xl bg-charcoal-dark px-3 border border-charcoal-light focus:border-gold outline-none"
      />
      {error && <p className="text-sm text-red-400">{error}</p>}
      <button
        type="submit"
        disabled={phone.length !== 10}
        className="min-h-11 w-full rounded-xl bg-gold text-charcoal-dark font-semibold disabled:opacity-40"
      >
        {t('home.findSpot')}
      </button>
    </form>
  )
}

export default function Home() {
  const { t } = useT()
  const joiningOpen = isJoiningOpen()
  const { waiting, waitMinutes } = DUMMY_QUEUE
  const closed = !DUMMY_SETTINGS.queueOpen

  return (
    <div className="max-w-md mx-auto space-y-5">
      <div className="text-center space-y-2">
        <div className="mx-auto h-16 w-16 rounded-full bg-gold text-charcoal-dark grid place-items-center text-3xl font-bold">
          R
        </div>
        <h1 className="text-2xl font-bold">{t('salonName')}</h1>
        <span
          className={`inline-block rounded-full px-3 py-1 text-sm font-semibold ${
            closed ? 'bg-red-500/20 text-red-300' : 'bg-emerald-500/20 text-emerald-300'
          }`}
        >
          {closed
            ? t('home.closed')
            : `${t('home.open')} · ${t('home.closes')} ${DUMMY_SETTINGS.closesLabel}`}
        </span>
      </div>

      <div className="rounded-card bg-charcoal-light p-5 text-center border border-gold/30">
        {waiting === 0 ? (
          <p className="text-lg font-semibold text-gold">{t('home.nobody')}</p>
        ) : (
          <p className="text-lg">
            <span className="text-3xl font-bold text-gold">{waiting}</span>{' '}
            {t('home.peopleWaiting')} · {t('home.about')}{' '}
            <span className="font-bold">{waitMinutes}</span> {t('common.min')}
          </p>
        )}
      </div>

      <ul className="flex flex-wrap justify-center gap-2" aria-label={t('home.barbers')}>
        {DUMMY_BARBERS.map((b) => (
          <li
            key={b.id}
            className={`rounded-full border px-3 py-1.5 text-sm font-medium ${CHIP[b.status]}`}
          >
            {b.name} · {t(`barberStatus.${b.status}`)}
          </li>
        ))}
      </ul>

      {joiningOpen ? (
        <Link
          to="/join"
          className="block w-full min-h-14 leading-14 rounded-2xl bg-gold text-center text-xl font-bold text-charcoal-dark shadow-lg"
        >
          {t('home.joinQueue')}
        </Link>
      ) : (
        <div className="space-y-2">
          <button
            type="button"
            disabled
            className="block w-full min-h-14 rounded-2xl bg-gold text-xl font-bold text-charcoal-dark opacity-40"
          >
            {t('home.joinQueue')}
          </button>
          <p className="text-center text-sm text-amber-300">{t('home.joinClosedMsg')}</p>
        </div>
      )}

      <AlreadyJoined />
    </div>
  )
}
