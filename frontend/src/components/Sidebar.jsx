import { useTranslation } from '../i18n/useTranslation.jsx'

const NAV_ITEMS = [
    {
        group: 'groupHome',
        items: [
            { id: 'upload', label: 'navUpload', icon: '📂', requiresIfc: false },
        ],
    },
    {
        group: 'groupDictionary',
        items: [
            { id: 'dictionary', label: 'navDictionary', icon: '📖', requiresIfc: false },
        ],
    },
    {
        group: 'groupAnalysis',
        items: [
            { id: 'header', label: 'navHeader', icon: '📋', requiresIfc: true },
            { id: 'version', label: 'navVersion', icon: '🏷️', requiresIfc: true },
            { id: 'units', label: 'navUnits', icon: '📐', requiresIfc: true },
            { id: 'georef', label: 'navGeoref', icon: '🌍', requiresIfc: true },
        ],
    },
    {
        group: 'groupValidation',
        items: [
            { id: 'validation', label: 'navValidation', icon: '📊', requiresIfc: true },
        ],
    },
    {
        group: 'groupChat',
        items: [
            { id: 'chat', label: 'navChat', icon: '🤖', requiresIfc: true },
        ],
    },
]

export default function Sidebar({ activeView, onViewChange, ifcLoaded, fileName, fileStatus }) {
    const { t, lang, setLang } = useTranslation()

    return (
        <aside className="sidebar">
            <div className="sidebar-header">
                <div className="sidebar-logo">IF</div>
                <div>
                    <div className="sidebar-title">{t('appTitle')}</div>
                    <div className="sidebar-subtitle">{t('appSubtitle')}</div>
                </div>
            </div>

            {ifcLoaded && fileName && (
                <div className="file-badge">
                    <span className="file-badge-icon">📄</span>
                    <div className="file-badge-info">
                        <div className="file-badge-name" title={fileName}>{fileName}</div>
                        <div className={`file-badge-status ${fileStatus === 'done' ? '' : fileStatus === 'error' ? 'error' : 'processing'}`}>
                            {fileStatus === 'done' ? t('uploadDone') : fileStatus === 'error' ? t('uploadError') : t('uploadProcessing')}
                        </div>
                    </div>
                </div>
            )}

            <nav className="sidebar-nav">
                {NAV_ITEMS.map(group => (
                    <div className="sidebar-group" key={group.group}>
                        <div className="sidebar-group-label">{t(group.group)}</div>
                        {group.items.map(item => {
                            const disabled = item.requiresIfc && !ifcLoaded
                            return (
                                <div
                                    key={item.id}
                                    className={`sidebar-item ${activeView === item.id ? 'active' : ''} ${disabled ? 'disabled' : ''}`}
                                    onClick={() => !disabled && onViewChange(item.id)}
                                    role="button"
                                    tabIndex={disabled ? -1 : 0}
                                    onKeyDown={e => {
                                        if ((e.key === 'Enter' || e.key === ' ') && !disabled) {
                                            e.preventDefault()
                                            onViewChange(item.id)
                                        }
                                    }}
                                >
                                    <span className="sidebar-item-icon">{item.icon}</span>
                                    {t(item.label)}
                                </div>
                            )
                        })}
                    </div>
                ))}
            </nav>

            <div className="sidebar-footer">
                <div className="lang-toggle">
                    <button
                        className={`lang-btn ${lang === 'pt' ? 'active' : ''}`}
                        onClick={() => setLang('pt')}
                    >
                        PT
                    </button>
                    <button
                        className={`lang-btn ${lang === 'en' ? 'active' : ''}`}
                        onClick={() => setLang('en')}
                    >
                        EN
                    </button>
                </div>
            </div>
        </aside>
    )
}
