import { useEffect, useState } from 'react'
import { useT } from '../i18n/index.jsx'
import { api, clearStaffPin, postJson } from '../api.js'
import { usePolling } from '../usePolling.js'
import StaffGate from '../components/StaffGate.jsx'

const KNOWN_ERRORS = ['finish_first', 'invalid_name', 'invalid_minutes', 'invalid_price', 'not_found']

function Switch({ on, onClick, disabled, label, onText, offText }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className={`min-h-11 min-w-24 rounded-full px-4 text-sm font-semibold border-2 disabled:opacity-50 ${
        on
          ? 'border-emerald-400 bg-emerald-500/20 text-emerald-300'
          : 'border-gray-500 bg-gray-500/20 text-gray-300'
      }`}
    >
      {on ? onText : offText}
    </button>
  )
}

function StatCard({ label, value }) {
  return (
    <div className="rounded-card bg-charcoal-light p-4 text-center border border-gold/30">
      <div className="text-3xl font-extrabold text-gold">{value}</div>
      <div className="mt-1 text-xs text-gray-300">{label}</div>
    </div>
  )
}

function ServiceForm({ service, onClose, onSaved }) {
  const { t } = useT()
  const editing = Boolean(service)
  const [en, setEn] = useState(service?.name.en ?? '')
  const [gu, setGu] = useState(service?.name.gu ?? '')
  const [minutes, setMinutes] = useState(service ? String(service.minutes) : '')
  const [price, setPrice] = useState(service ? String(service.price) : '')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const m = Number(minutes)
  const p = Number(price)
  const problem =
    !en.trim() || !gu.trim()
      ? 'invalid_name'
      : !Number.isInteger(m) || minutes === '' || m < 5 || m > 180
        ? 'invalid_minutes'
        : !Number.isInteger(p) || price === '' || p < 0 || p > 5000
          ? 'invalid_price'
          : null

  async function submit(e) {
    e.preventDefault()
    if (problem) {
      setError(t(`admin.err.${problem}`))
      return
    }
    setBusy(true)
    setError('')
    const body = { name: { en: en.trim(), gu: gu.trim() }, minutes: m, price: p }
    try {
      if (editing) {
        await api(`/api/admin/services/${service.id}`, {
          method: 'PUT',
          body: JSON.stringify(body),
          staff: true,
        })
      } else {
        await postJson('/api/admin/services', body, { staff: true })
      }
      onSaved()
    } catch (err) {
      setError(KNOWN_ERRORS.includes(err.code) ? t(`admin.err.${err.code}`) : t('admin.err.generic'))
      setBusy(false)
    }
  }

  const field =
    'w-full min-h-11 rounded-xl bg-charcoal-dark px-3 border border-charcoal-light focus:border-gold outline-none'

  return (
    <div role="dialog" aria-modal="true" className="fixed inset-0 z-50 grid place-items-center bg-black/70 p-4">
      <form
        onSubmit={submit}
        className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-card bg-charcoal p-5 space-y-4 border border-gold/40"
      >
        <h2 className="text-xl font-bold text-gold">
          {editing ? t('admin.editService') : t('admin.addService')}
        </h2>
        <div className="space-y-1">
          <label htmlFor="sv-en" className="text-sm text-gray-300">
            {t('admin.nameEn')}
          </label>
          <input id="sv-en" value={en} maxLength={40} onChange={(e) => setEn(e.target.value)} className={field} />
        </div>
        <div className="space-y-1">
          <label htmlFor="sv-gu" className="text-sm text-gray-300">
            {t('admin.nameGu')}
          </label>
          <input id="sv-gu" value={gu} maxLength={40} onChange={(e) => setGu(e.target.value)} className={field} />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label htmlFor="sv-min" className="text-sm text-gray-300">
              {t('admin.minutes')} (5–180)
            </label>
            <input
              id="sv-min"
              type="number"
              inputMode="numeric"
              min="5"
              max="180"
              value={minutes}
              onChange={(e) => setMinutes(e.target.value)}
              className={field}
            />
          </div>
          <div className="space-y-1">
            <label htmlFor="sv-price" className="text-sm text-gray-300">
              {t('admin.price')} ₹ (0–5000)
            </label>
            <input
              id="sv-price"
              type="number"
              inputMode="numeric"
              min="0"
              max="5000"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className={field}
            />
          </div>
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
            disabled={busy}
            className="flex-1 min-h-12 rounded-xl bg-gold font-bold text-charcoal-dark disabled:opacity-50"
          >
            {t('admin.save')}
          </button>
        </div>
      </form>
    </div>
  )
}

function Settings() {
  const { t, lang } = useT()
  const { data, error, reload } = usePolling('/api/admin', { staff: true })
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [form, setForm] = useState(null) // null | 'new' | service object

  useEffect(() => {
    if (error?.status === 401) {
      clearStaffPin()
      window.location.reload()
    }
  }, [error])

  async function act(fn) {
    setBusy(true)
    setMessage('')
    try {
      await fn()
    } catch (err) {
      setMessage(KNOWN_ERRORS.includes(err.code) ? t(`admin.err.${err.code}`) : t('admin.err.generic'))
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

  const { settings, stats, services, barbers } = data

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-gold">{t('screens.admin')}</h1>
      {error && <p className="text-xs text-amber-300">{t('common.serverError')}</p>}
      {message && (
        <p role="alert" className="rounded-xl bg-red-500/15 border border-red-500/40 p-3 text-sm text-red-300">
          {message}
        </p>
      )}

      <section className="rounded-card bg-charcoal-light p-4 flex items-center justify-between gap-3">
        <div>
          <div className="font-semibold">{t('admin.queueSwitch')}</div>
          <div className="text-xs text-gray-300">{t('admin.queueHint')}</div>
        </div>
        <Switch
          on={settings.queueOpen}
          disabled={busy}
          label={t('admin.queueSwitch')}
          onText={t('admin.open')}
          offText={t('admin.closed')}
          onClick={() => act(() => postJson('/api/admin/queue', { open: !settings.queueOpen }, { staff: true }))}
        />
      </section>

      <section aria-label={t('admin.stats')}>
        <h2 className="mb-2 text-sm uppercase tracking-wide text-gray-400">{t('admin.stats')}</h2>
        <div className="grid grid-cols-3 gap-3">
          <StatCard label={t('admin.served')} value={stats.served} />
          <StatCard
            label={t('admin.avgWait')}
            value={stats.averageWait == null ? '—' : `${stats.averageWait} ${t('common.min')}`}
          />
          <StatCard label={t('admin.noShows')} value={stats.noShows} />
        </div>
      </section>

      <section aria-label={t('admin.services')} className="space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm uppercase tracking-wide text-gray-400">{t('admin.services')}</h2>
          <button
            type="button"
            onClick={() => setForm('new')}
            className="min-h-11 rounded-xl bg-gold px-4 font-semibold text-charcoal-dark"
          >
            {t('admin.addService')}
          </button>
        </div>
        <ul className="space-y-2">
          {services.map((s) => (
            <li
              key={s.id}
              className={`rounded-card bg-charcoal-light p-3 flex flex-wrap items-center gap-3 ${
                s.on ? '' : 'opacity-60'
              }`}
            >
              <div className="flex-1 min-w-40">
                <div className="font-semibold">{s.name[lang]}</div>
                <div className="text-xs text-gray-300">
                  {s.name.en} / {s.name.gu}
                </div>
                <div className="text-sm text-gray-300">
                  {s.minutes} {t('common.min')} · ₹{s.price}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setForm(s)}
                className="min-h-11 rounded-xl border border-gold/60 px-4 text-sm font-semibold text-gold"
              >
                {t('admin.edit')}
              </button>
              <Switch
                on={s.on}
                disabled={busy}
                label={s.name[lang]}
                onText={t('admin.on')}
                offText={t('admin.off')}
                onClick={() =>
                  act(() =>
                    api(`/api/admin/services/${s.id}`, {
                      method: 'PUT',
                      body: JSON.stringify({ on: !s.on }),
                      staff: true,
                    }),
                  )
                }
              />
            </li>
          ))}
        </ul>
      </section>

      <section aria-label={t('admin.barbersOnDuty')} className="space-y-2">
        <h2 className="text-sm uppercase tracking-wide text-gray-400">{t('admin.barbersOnDuty')}</h2>
        <ul className="space-y-2">
          {barbers.map((b) => (
            <li key={b.id} className="rounded-card bg-charcoal-light p-3 flex items-center justify-between gap-3">
              <div>
                <div className="font-semibold">{b.name}</div>
                <div className="text-xs text-gray-300">{t(`barberStatus.${b.status}`)}</div>
              </div>
              <Switch
                on={b.onDuty}
                disabled={busy}
                label={b.name}
                onText={t('admin.onDuty')}
                offText={t('admin.offDuty')}
                onClick={() =>
                  act(() => postJson(`/api/admin/barbers/${b.id}/duty`, { onDuty: !b.onDuty }, { staff: true }))
                }
              />
            </li>
          ))}
        </ul>
      </section>

      {form && (
        <ServiceForm
          service={form === 'new' ? null : form}
          onClose={() => setForm(null)}
          onSaved={() => {
            setForm(null)
            reload()
          }}
        />
      )}
    </div>
  )
}

export default function Admin() {
  return (
    <StaffGate>
      <Settings />
    </StaffGate>
  )
}
