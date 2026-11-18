import { Link, useParams } from 'react-router-dom'
import Placeholder from '../components/Placeholder.jsx'
import { useT } from '../i18n/index.jsx'

export const StaffPin = () => <Placeholder titleKey="screens.pin" route="(PIN gate for staff screens)" />
export const Status = () => {
  const { id } = useParams()
  return <Placeholder titleKey="screens.status" route={`/status/${id}`} />
}
export const Reception = () => <Placeholder titleKey="screens.reception" route="/reception" />
export const Barber = () => {
  const { name } = useParams()
  return <Placeholder titleKey="screens.barber" route={`/barber/${name}`} />
}
export const Display = () => <Placeholder titleKey="screens.display" route="/display" />
export const Admin = () => <Placeholder titleKey="screens.admin" route="/admin" />
export const NotFound = () => {
  const { t } = useT()
  return (
    <section className="max-w-xl mx-auto rounded-card bg-charcoal-light p-6">
      <h1 className="text-2xl font-bold text-gold">{t('screens.notFound')}</h1>
      <Link to="/" className="inline-block mt-4 min-h-11 leading-11 text-gold underline">
        {t('common.backHome')}
      </Link>
    </section>
  )
}
