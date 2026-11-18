import { Link, Outlet } from 'react-router-dom'
import { useT } from '../i18n/index.jsx'

function LangToggle() {
  const { lang, setLang } = useT()
  const base = 'min-h-11 min-w-11 px-3 rounded-full text-sm font-semibold transition-colors'
  return (
    <div className="flex gap-1 rounded-full bg-charcoal-dark p-1" role="group" aria-label="Language">
      <button
        type="button"
        onClick={() => setLang('en')}
        aria-pressed={lang === 'en'}
        className={`${base} ${lang === 'en' ? 'bg-gold text-charcoal-dark' : 'text-gray-300'}`}
      >
        EN
      </button>
      <button
        type="button"
        onClick={() => setLang('gu')}
        aria-pressed={lang === 'gu'}
        className={`${base} ${lang === 'gu' ? 'bg-gold text-charcoal-dark' : 'text-gray-300'}`}
      >
        ગુ
      </button>
    </div>
  )
}

export default function Layout() {
  const { t } = useT()
  return (
    <div className="min-h-screen">
      <header className="flex items-center justify-between gap-3 px-4 py-3 border-b border-charcoal-light">
        <Link to="/" className="text-xl font-bold text-gold">
          {t('salonName')}
        </Link>
        <LangToggle />
      </header>
      <main className="p-4">
        <Outlet />
      </main>
    </div>
  )
}
