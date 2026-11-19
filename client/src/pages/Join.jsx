import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useT } from '../i18n/index.jsx'
import { postJson } from '../api.js'
import { usePolling } from '../usePolling.js'

const MAX_SERVICES = 3

const fieldClass =
  'w-full min-h-11 rounded-xl bg-charcoal-dark px-3 border border-charcoal-light focus:border-gold outline-none'

export default function Join() {
  const { t, lang } = useT()
  const navigate = useNavigate()
  const { data, error } = usePolling('/api/public')
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [selected, setSelected] = useState([])
  const [barber, setBarber] = useState('any')
  const [touched, setTouched] = useState({ name: false, phone: false })
  const [maxHit, setMaxHit] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  if (!data) {
    return (
      <p className="text-center text-gray-300 mt-10">
        {error ? t('common.serverError') : t('common.loading')}
      </p>
    )
  }

  if (!data.settings.joiningOpen) {
    return (
      <div className="max-w-md mx-auto rounded-card bg-charcoal-light p-6 text-center space-y-4">
        <p className="text-amber-300">{t('home.joinClosedMsg')}</p>
        <Link to="/" className="inline-block min-h-11 leading-11 text-gold underline">
          {t('common.backHome')}
        </Link>
      </div>
    )
  }

  const services = data.services
  const barbers = data.barbers.filter((b) => b.status !== 'off')
  const chosen = services.filter((s) => selected.includes(s.id))
  const totalMin = chosen.reduce((sum, s) => sum + s.minutes, 0)
  const totalPrice = chosen.reduce((sum, s) => sum + s.price, 0)
  const wait = data.waits[barber]
  const chosenBarber = barbers.find((b) => b.id === barber)

  const nameOk = name.trim().length >= 2
  const phoneOk = /^\d{10}$/.test(phone)
  const canConfirm = nameOk && phoneOk && chosen.length >= 1 && !submitting

  function toggleService(id) {
    if (selected.includes(id)) {
      setSelected(selected.filter((x) => x !== id))
      setMaxHit(false)
    } else if (selected.length >= MAX_SERVICES) {
      setMaxHit(true)
      setTimeout(() => setMaxHit(false), 600)
    } else {
      setSelected([...selected, id])
    }
  }

  async function confirm() {
    if (!canConfirm) return
    setSubmitting(true)
    setSubmitError('')
    try {
      const { spot, existing } = await postJson('/api/join', {
        name: name.trim(),
        phone,
        serviceIds: selected,
        barberId: barber,
      })
      navigate(`/status/${spot.id}`, { state: { alreadyInQueue: existing } })
    } catch (err) {
      setSubmitError(err.code === 'closed' ? t('home.joinClosedMsg') : t('join.submitError'))
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-md mx-auto space-y-6 pb-36">
      <h1 className="text-2xl font-bold text-gold">{t('screens.join')}</h1>

      <div className="space-y-1">
        <label htmlFor="name" className="text-sm text-gray-300">
          {t('join.name')}
        </label>
        <input
          id="name"
          autoComplete="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onBlur={() => setTouched((x) => ({ ...x, name: true }))}
          className={fieldClass}
        />
        {touched.name && !nameOk && <p className="text-sm text-red-400">{t('join.nameError')}</p>}
      </div>

      <div className="space-y-1">
        <label htmlFor="phone" className="text-sm text-gray-300">
          {t('join.phone')}
        </label>
        <input
          id="phone"
          type="tel"
          inputMode="numeric"
          autoComplete="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
          onBlur={() => setTouched((x) => ({ ...x, phone: true }))}
          className={fieldClass}
        />
        {touched.phone && !phoneOk && <p className="text-sm text-red-400">{t('join.phoneError')}</p>}
      </div>

      <fieldset className="space-y-2">
        <legend className="text-sm text-gray-300">
          {t('join.services')} ({selected.length}/{MAX_SERVICES})
        </legend>
        {maxHit && <p className="text-sm text-amber-300">{t('join.maxServices')}</p>}
        <div className={`grid grid-cols-1 gap-2 ${maxHit ? 'animate-pulse' : ''}`}>
          {services.map((s) => {
            const on = selected.includes(s.id)
            return (
              <button
                key={s.id}
                type="button"
                onClick={() => toggleService(s.id)}
                aria-pressed={on}
                className={`min-h-14 rounded-card p-3 text-left flex items-center justify-between border-2 transition-colors ${
                  on ? 'border-gold bg-gold/10' : 'border-charcoal-light bg-charcoal-light'
                }`}
              >
                <span>
                  <span className="block font-semibold">{s.name[lang]}</span>
                  <span className="block text-sm text-gray-300">
                    {s.minutes} {t('common.min')}
                  </span>
                </span>
                <span className="flex items-center gap-3">
                  <span className="font-bold">₹{s.price}</span>
                  <span
                    className={`h-6 w-6 rounded-full grid place-items-center text-sm ${
                      on ? 'bg-gold text-charcoal-dark' : 'border border-gray-500'
                    }`}
                    aria-hidden="true"
                  >
                    {on ? '✓' : ''}
                  </span>
                </span>
              </button>
            )
          })}
        </div>
      </fieldset>

      <fieldset className="space-y-2">
        <legend className="text-sm text-gray-300">{t('join.barber')}</legend>
        <div className="grid grid-cols-2 gap-2">
          <BarberCard
            selected={barber === 'any'}
            onClick={() => setBarber('any')}
            initial="★"
            title={t('join.anyBarber')}
            note={t('join.fastest')}
            wide
          />
          {barbers.map((b) => (
            <BarberCard
              key={b.id}
              selected={barber === b.id}
              onClick={() => setBarber(b.id)}
              initial={b.name[0]}
              title={b.name}
              note={t(`barberStatus.${b.status}`)}
              warn={b.status === 'break'}
            />
          ))}
        </div>
        {chosenBarber?.status === 'break' && (
          <p className="text-sm text-amber-300">{t('join.onBreakNote', { barber: chosenBarber.name })}</p>
        )}
      </fieldset>

      <div className="fixed bottom-0 inset-x-0 bg-charcoal-dark border-t border-gold/40 p-4">
        <div className="max-w-md mx-auto space-y-2">
          <p className="text-center text-sm">
            {chosen.length === 0 ? (
              t('join.pickService')
            ) : (
              <>
                {t('join.total')} <b>{totalMin}</b> {t('common.min')} · <b>₹{totalPrice}</b> ·{' '}
                {wait == null ? (
                  t('join.noBarberWorking')
                ) : (
                  <>
                    {t('join.expectedWait')} ~<b>{wait}</b> {t('common.min')}
                  </>
                )}
              </>
            )}
          </p>
          {submitError && <p className="text-center text-sm text-red-400">{submitError}</p>}
          <button
            type="button"
            onClick={confirm}
            disabled={!canConfirm}
            className="w-full min-h-12 rounded-xl bg-gold text-charcoal-dark font-bold text-lg disabled:opacity-40"
          >
            {t('join.confirm')}
          </button>
        </div>
      </div>
    </div>
  )
}

function BarberCard({ selected, onClick, initial, title, note, wide, warn }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`min-h-14 rounded-card p-3 flex items-center gap-3 text-left border-2 ${
        wide ? 'col-span-2' : ''
      } ${selected ? 'border-gold bg-gold/10' : 'border-charcoal-light bg-charcoal-light'}`}
    >
      <span className="h-10 w-10 shrink-0 rounded-full bg-charcoal-dark grid place-items-center font-bold text-gold">
        {initial}
      </span>
      <span>
        <span className="block font-semibold">{title}</span>
        <span className={`block text-xs ${warn ? 'text-amber-300' : 'text-gray-300'}`}>{note}</span>
      </span>
    </button>
  )
}
