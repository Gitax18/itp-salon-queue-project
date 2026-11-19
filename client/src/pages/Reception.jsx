import { useEffect, useState } from 'react'
import { useT } from '../i18n/index.jsx'
import { clearStaffPin, postJson } from '../api.js'
import { usePolling } from '../usePolling.js'
import StaffGate from '../components/StaffGate.jsx'

const MAX_SERVICES = 3

const STATUS_CHIP = {
  busy: 'bg-amber-500/20 text-amber-300',
  free: 'bg-emerald-500/20 text-emerald-300',
  break: 'bg-gray-500/20 text-gray-300',
  off: 'bg-gray-500/10 text-gray-500',
}

function BarberCard({ barber, onCallNext, busy }) {
  const { t, lang } = useT()
  const { current } = barber
  const unavailable = barber.status === 'break' || barber.status === 'off'
  const pct =
    current && current.status === 'in_chair' && current.totalMinutes > 0
      ? Math.round((current.minutesLeft / current.totalMinutes) * 100)
      : 0

  return (
    <div
      className={`rounded-card p-3 space-y-2 border ${
        unavailable ? 'bg-charcoal-light/40 border-charcoal-light opacity-70' : 'bg-charcoal-light border-gold/30'
      }`}
    >
      <div className="flex items-center justify-between gap-1">
        <span className="font-bold">{barber.name}</span>
        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${STATUS_CHIP[barber.status]}`}>
          {t(`barberStatus.${barber.status}`)}
        </span>
      </div>

      <div className="min-h-16 text-sm">
        {current ? (
          <>
            <div className="font-semibold text-gold">
              {current.id} · {current.name}
            </div>
            <div className="text-gray-300 text-xs">
              {current.services.map((s) => s?.[lang]).join(', ')}
            </div>
            {current.status === 'in_chair' ? (
              <>
                <div className="mt-1 h-2 rounded-full bg-charcoal-dark overflow-hidden">
                  <div className="h-full bg-gold" style={{ width: `${pct}%` }} />
                </div>
                <div className="text-xs text-gray-300 mt-1">
                  {t('reception.timeLeft', { n: current.minutesLeft })}
                </div>
              </>
            ) : (
              <div className="text-xs text-amber-300 mt-1">{t('reception.onTheWay')}</div>
            )}
          </>
        ) : (
          <span className="text-gray-400">{t('reception.noCustomer')}</span>
        )}
      </div>

      {!unavailable && (
        <button
          type="button"
          onClick={() => onCallNext(barber.id)}
          disabled={!barber.canCallNext || busy}
          title={!barber.canCallNext ? t('reception.noEligible') : undefined}
          className="w-full min-h-11 rounded-xl bg-gold text-charcoal-dark font-bold disabled:opacity-40"
        >
          {t('reception.callNext')}
        </button>
      )}
    </div>
  )
}

function QueueRow({ row, onNoShow, onCancel, busy }) {
  const { t, lang } = useT()
  const [sure, setSure] = useState(false)
  useEffect(() => {
    if (!sure) return
    const timer = setTimeout(() => setSure(false), 3000)
    return () => clearTimeout(timer)
  }, [sure])

  const called = row.status === 'called'
  const longWait = !called && row.waitedMinutes > 60
  const tone = called
    ? 'border-gold bg-gold/15'
    : longWait
      ? 'border-amber-500 bg-amber-500/15'
      : 'border-charcoal-light bg-charcoal-light'

  return (
    <li className={`rounded-card border-2 p-3 flex flex-wrap items-center gap-3 ${tone}`}>
      <span className="text-xl font-extrabold text-gold w-16">{row.id}</span>
      <div className="flex-1 min-w-40">
        <div className="font-semibold">{row.name}</div>
        <div className="text-xs text-gray-300">
          {row.services.map((s) => s?.[lang]).join(', ')} · {row.totalMinutes} {t('common.min')}
        </div>
        <div className="text-xs text-gray-300">
          {t('status.barber')}: {row.barberName ?? t('join.anyBarber')}
        </div>
      </div>
      <div className="text-sm text-right">
        {called ? (
          <span className="font-bold text-gold">
            {t('reception.calledTo', { barber: row.calledBarberName })}
          </span>
        ) : (
          <span className={longWait ? 'font-bold text-amber-300' : 'text-gray-300'}>
            {t('reception.waited', { n: row.waitedMinutes })}
          </span>
        )}
      </div>
      <div className="flex gap-2">
        {row.canNoShow && (
          <button
            type="button"
            onClick={() => onNoShow(row.id)}
            disabled={busy}
            className="min-h-11 rounded-xl bg-amber-500 px-3 text-sm font-semibold text-charcoal-dark disabled:opacity-50"
          >
            {t('reception.noShow')}
          </button>
        )}
        <button
          type="button"
          onClick={() => (sure ? onCancel(row.id) : setSure(true))}
          disabled={busy}
          className={`min-h-11 rounded-xl border px-3 text-sm font-semibold disabled:opacity-50 ${
            sure ? 'bg-red-500 border-red-500 text-white' : 'border-red-400/60 text-red-300'
          }`}
        >
          {sure ? t('reception.sure') : t('reception.cancel')}
        </button>
      </div>
    </li>
  )
}

function WalkInModal({ services, barbers, onClose, onDone }) {
  const { t, lang } = useT()
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [selected, setSelected] = useState([])
  const [barber, setBarber] = useState('any')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const valid = name.trim().length >= 2 && /^\d{10}$/.test(phone) && selected.length >= 1

  function toggle(id) {
    if (selected.includes(id)) setSelected(selected.filter((x) => x !== id))
    else if (selected.length >= MAX_SERVICES) setError(t('join.maxServices'))
    else {
      setSelected([...selected, id])
      setError('')
    }
  }

  async function submit(e) {
    e.preventDefault()
    if (!valid) return
    setBusy(true)
    setError('')
    try {
      const { spot, existing } = await postJson(
        '/api/reception/walk-in',
        { name: name.trim(), phone, serviceIds: selected, barberId: barber },
        { staff: true },
      )
      onDone(existing ? t('reception.alreadyIn', { id: spot.id }) : '')
    } catch {
      setError(t('reception.err.generic'))
      setBusy(false)
    }
  }

  const field =
    'w-full min-h-11 rounded-xl bg-charcoal-dark px-3 border border-charcoal-light focus:border-gold outline-none'

  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4">
      <form
        onSubmit={submit}
        className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-card bg-charcoal p-5 space-y-4 border border-gold/40"
      >
        <h2 className="text-xl font-bold text-gold">{t('reception.walkInTitle')}</h2>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label htmlFor="wi-name" className="text-sm text-gray-300">
              {t('join.name')}
            </label>
            <input id="wi-name" value={name} onChange={(e) => setName(e.target.value)} className={field} />
          </div>
          <div className="space-y-1">
            <label htmlFor="wi-phone" className="text-sm text-gray-300">
              {t('join.phone')}
            </label>
            <input
              id="wi-phone"
              inputMode="numeric"
              value={phone}
              onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
              className={field}
            />
          </div>
        </div>

        <fieldset className="space-y-2">
          <legend className="text-sm text-gray-300">
            {t('join.services')} ({selected.length}/{MAX_SERVICES})
          </legend>
          <div className="grid grid-cols-2 gap-2">
            {services.map((s) => {
              const on = selected.includes(s.id)
              return (
                <button
                  key={s.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggle(s.id)}
                  className={`min-h-12 rounded-xl border-2 p-2 text-left text-sm ${
                    on ? 'border-gold bg-gold/10' : 'border-charcoal-light bg-charcoal-light'
                  }`}
                >
                  <span className="block font-semibold">{s.name[lang]}</span>
                  <span className="block text-xs text-gray-300">
                    {s.minutes} {t('common.min')} · ₹{s.price}
                  </span>
                </button>
              )
            })}
          </div>
        </fieldset>

        <div className="space-y-1">
          <label htmlFor="wi-barber" className="text-sm text-gray-300">
            {t('join.barber')}
          </label>
          <select id="wi-barber" value={barber} onChange={(e) => setBarber(e.target.value)} className={field}>
            <option value="any">{t('join.anyBarber')}</option>
            {barbers
              .filter((b) => b.status !== 'off')
              .map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name} ({t(`barberStatus.${b.status}`)})
                </option>
              ))}
          </select>
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 min-h-12 rounded-xl border border-charcoal-light font-semibold"
          >
            {t('common.close')}
          </button>
          <button
            type="submit"
            disabled={!valid || busy}
            className="flex-1 min-h-12 rounded-xl bg-gold font-bold text-charcoal-dark disabled:opacity-40"
          >
            {t('reception.addToQueue')}
          </button>
        </div>
      </form>
    </div>
  )
}

function Dashboard() {
  const { t } = useT()
  const { data, error, reload } = usePolling('/api/reception', { staff: true })
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [showWalkIn, setShowWalkIn] = useState(false)

  // PIN no longer valid (e.g. server PIN changed): back to the gate.
  useEffect(() => {
    if (error?.status === 401) {
      clearStaffPin()
      window.location.reload()
    }
  }, [error])

  async function act(path, extraVars) {
    setBusy(true)
    setMessage('')
    try {
      await postJson(path, {}, { staff: true })
    } catch (err) {
      const known = ['barber_busy', 'barber_unavailable', 'no_eligible', 'too_early', 'not_called', 'not_found', 'not_cancellable']
      setMessage(
        known.includes(err.code)
          ? t(`reception.err.${err.code}`, extraVars)
          : t('reception.err.generic'),
      )
    }
    setBusy(false)
    reload()
  }

  if (!data) {
    return (
      <p className="text-center text-gray-300 mt-10">
        {error ? t('common.serverError') : t('common.loading')}
      </p>
    )
  }

  const { barbers, queue, services, settings, noShowMinutes } = data

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gold">{t('screens.reception')}</h1>
          <span
            className={`rounded-full px-3 py-1 text-xs font-semibold ${
              settings.joiningOpen ? 'bg-emerald-500/20 text-emerald-300' : 'bg-red-500/20 text-red-300'
            }`}
          >
            {settings.joiningOpen ? t('reception.onlineOpen') : t('reception.onlineClosed')}
          </span>
          {error && <span className="text-xs text-amber-300">{t('common.serverError')}</span>}
        </div>
        <button
          type="button"
          onClick={() => setShowWalkIn(true)}
          className="min-h-12 rounded-xl bg-gold px-5 font-bold text-charcoal-dark"
        >
          {t('reception.addWalkIn')}
        </button>
      </div>

      {message && (
        <p role="alert" className="rounded-xl bg-red-500/15 border border-red-500/40 p-3 text-sm text-red-300">
          {message}
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-5">
        <section className="lg:col-span-2 space-y-2" aria-label={t('reception.barbers')}>
          <h2 className="text-sm uppercase tracking-wide text-gray-400">{t('reception.barbers')}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            {barbers.map((b) => (
              <BarberCard
                key={b.id}
                barber={b}
                busy={busy}
                onCallNext={(id) => act(`/api/reception/call-next/${id}`)}
              />
            ))}
          </div>
        </section>

        <section className="lg:col-span-3 space-y-2" aria-label={t('reception.queue')}>
          <h2 className="text-sm uppercase tracking-wide text-gray-400">
            {t('reception.queue')} ({queue.length})
          </h2>
          {queue.length === 0 ? (
            <p className="rounded-card bg-charcoal-light p-6 text-center text-gold font-semibold">
              {t('home.nobody')}
            </p>
          ) : (
            <ul className="space-y-2">
              {queue.map((row) => (
                <QueueRow
                  key={row.id}
                  row={row}
                  busy={busy}
                  onNoShow={(id) => act(`/api/reception/no-show/${id}`, { n: noShowMinutes })}
                  onCancel={(id) => act(`/api/reception/cancel/${id}`)}
                />
              ))}
            </ul>
          )}
        </section>
      </div>

      {showWalkIn && (
        <WalkInModal
          services={services}
          barbers={barbers}
          onClose={() => setShowWalkIn(false)}
          onDone={(note) => {
            setShowWalkIn(false)
            setMessage(note)
            reload()
          }}
        />
      )}
    </div>
  )
}

export default function Reception() {
  return (
    <StaffGate>
      <Dashboard />
    </StaffGate>
  )
}
