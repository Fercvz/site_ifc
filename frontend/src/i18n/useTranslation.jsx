import { createContext, useContext, useState } from 'react'
import { translations } from './translations.js'

const LanguageContext = createContext()

export function LanguageProvider({ children }) {
    const [lang, setLang] = useState('pt')

    const t = (key) => {
        return translations[lang]?.[key] || translations['pt']?.[key] || key
    }

    const toggleLang = () => {
        setLang(prev => prev === 'pt' ? 'en' : 'pt')
    }

    return (
        <LanguageContext.Provider value={{ lang, setLang, toggleLang, t }}>
            {children}
        </LanguageContext.Provider>
    )
}

export function useTranslation() {
    const ctx = useContext(LanguageContext)
    if (!ctx) throw new Error('useTranslation must be used within LanguageProvider')
    return ctx
}
