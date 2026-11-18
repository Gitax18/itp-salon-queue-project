import { createContext, useContext, useEffect, useState } from 'react'
import en from './en.js'
import gu from './gu.js'

const dictionaries = { en, gu }
const STORAGE_KEY = 'salon-lang'

const LangContext = createContext({ lang: 'en', setLang: () => {}, t: (k) => k })

function lookup(dict, key) {
  return key.split('.').reduce((obj, part) => (obj == null ? obj : obj[part]), dict)
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

  // t('screens.home') -> text in current language, falls back to English, then the key
  const t = (key) => lookup(dictionaries[lang], key) ?? lookup(en, key) ?? key

  return <LangContext.Provider value={{ lang, setLang, t }}>{children}</LangContext.Provider>
}

export function useT() {
  return useContext(LangContext)
}
