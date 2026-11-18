import { useT } from '../i18n/index.jsx'

export default function Placeholder({ titleKey, route }) {
  const { t } = useT()
  return (
    <section className="max-w-xl mx-auto rounded-card bg-charcoal-light p-6 border border-gold/30">
      <h1 className="text-2xl font-bold text-gold">{t(titleKey)}</h1>
      <p className="mt-1 text-xs text-gray-400 font-mono">{route}</p>
      <p className="mt-4 text-gray-200">{t('placeholder')}</p>
    </section>
  )
}
