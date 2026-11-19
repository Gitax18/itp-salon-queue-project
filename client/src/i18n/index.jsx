import { createContext, useContext, useEffect, useState } from 'react'
import en from './en.js'
import gu from './gu.js'

const dictionaries = { en, gu }
const STORAGE_KEY = 'salon-lang'

const LangContext = createContext({ lang: 'en', setLang: () => {}, t: (k) => k })

function lookup(dict, key) {
  return key.split('.').reduce((obj, part) => (obj == null ? obj : obj[part]), dict)
}

// English ordinals (1st, 2nd, 3rd, 4th ...). Gujarati text uses the plain number instead.
export function ordinal(n) {
  const mod100 = n % 100
  if (mod100 >= 11 && mod100 <= 13) return `${n}th`
  return `${n}${{ 1: 'st', 2: 'nd', 3: 'rd' }[n % 10] || 'th'}`
}

export function LangProvider({ children }) {
  const [lang, setLang] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      return saved === 'gu' ? 'gu' : 'en'
    } catch {
      return 'en'
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, lang)
    } catch {
      /* ignore */
    }
    document.documentElement.lang = lang
  }, [lang])

  // t('screens.home') -> text in current language, falls back to English, then the key.
  // t('status.goTo', { barber: 'Ravi' }) replaces {barber} in the text.
  const t = (key, vars) => {
    const text = lookup(dictionaries[lang], key) ?? lookup(en, key) ?? key
    if (!vars || typeof text !== 'string') return text
    return text.replace(/\{(\w+)\}/g, (_, name) => (vars[name] ?? `{${name}}`))
  }

  return <LangContext.Provider value={{ lang, setLang, t }}>{children}</LangContext.Provider>
}

export function useT() {
  return useContext(LangContext)
}
