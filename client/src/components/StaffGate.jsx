import { useEffect, useState } from 'react'
import { useT } from '../i18n/index.jsx'
import { clearStaffPin, getStaffPin, postJson, setStaffPin } from '../api.js'

// Screen 0: wraps staff screens. Shows a PIN form until the server accepts the PIN.
export default function StaffGate({ children }) {
  const { t } = useT()
  const [state, setState] = useState('checking') // checking | locked | open
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    const saved = getStaffPin()
    if (!saved) {
      setState('locked')
      return
    }
    postJson('/api/staff/check', { pin: saved })
      .then(() => setState('open'))
      .catch((err) => {
        if (err.status === 401) clearStaffPin()
        setState('locked')
      })
  }, [])

  async function unlock(e) {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      await postJson('/api/staff/check', { pin })
      setStaffPin(pin)
      setState('open')
    } catch (err) {
      setError(err.status === 401 ? t('pin.wrong') : t('common.serverError'))
      setPin('')
    }
    setBusy(false)
  }

  if (state === 'open') return children
  if (state === 'checking') {
    return <p className="text-center text-gray-300 mt-10">{t('common.loading')}</p>
  }

  return (
    <form
      onSubmit={unlock}
      className="max-w-xs mx-auto mt-10 rounded-card bg-charcoal-light p-6 space-y-4 border border-gold/30"
    >
      <h1 className="text-2xl font-bold text-gold text-center">{t('pin.title')}</h1>
      <label htmlFor="pin" className="block text-sm text-gray-300">
        {t('pin.label')}
      </label>
      <input
        id="pin"
        type="password"
        inputMode="numeric"
        autoComplete="off"
        maxLength={4}
        value={pin}
        onChange={(e) => {
          setPin(e.target.value.replace(/\D/g, '').slice(0, 4))
          setError('')
        }}
        className="w-full min-h-12 rounded-xl bg-charcoal-dark px-3 text-center text-2xl tracking-[0.5em] border border-charcoal-light focus:border-gold outline-none"
      />
      {error && <p className="text-sm text-red-400 text-center">{error}</p>}
      <button
        type="submit"
        disabled={pin.length !== 4 || busy}
        className="w-full min-h-12 rounded-xl bg-gold text-charcoal-dark font-bold disabled:opacity-40"
      >
        {t('pin.unlock')}
      </button>
    </form>
  )
}
