import { useState } from 'react'
import { useTranslation } from '../i18n/useTranslation.jsx'
import { dictionaryEntries } from '../i18n/translations.js'

export default function DictionaryView() {
    const { t, lang } = useTranslation()
    const [search, setSearch] = useState('')
    const [expanded, setExpanded] = useState(null)

    const entities = Object.keys(dictionaryEntries)
    const filtered = entities.filter(name =>
        name.toLowerCase().includes(search.toLowerCase())
    )

    return (
        <div className="animate-in">
            <div className="view-header">
                <h1 className="view-title">{t('dictTitle')}</h1>
                <p className="view-subtitle">{t('dictSubtitle')}</p>
            </div>

            <div className="dict-search-wrapper" style={{ marginBottom: 20 }}>
                <span className="dict-search-icon">🔍</span>
                <input
                    className="dict-search"
                    type="text"
                    placeholder={t('dictSearch')}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />
            </div>

            {filtered.map(name => {
                const entry = dictionaryEntries[name]
                const langData = entry[lang] || entry.pt
                const isExpanded = expanded === name

                return (
                    <div
                        key={name}
                        className={`dict-entity-card ${isExpanded ? 'expanded' : ''}`}
                        onClick={() => setExpanded(isExpanded ? null : name)}
                    >
                        <div className="dict-entity-name">{name}</div>
                        <div className="dict-entity-desc">{langData.short}</div>
                        {isExpanded && (
                            <div className="dict-entity-details">
                                <p>{langData.long}</p>
                            </div>
                        )}
                    </div>
                )
            })}

            {filtered.length === 0 && (
                <div className="empty-state">
                    <div className="empty-state-text">
                        {lang === 'pt' ? 'Nenhuma entidade encontrada' : 'No entity found'}
                    </div>
                </div>
            )}
        </div>
    )
}
