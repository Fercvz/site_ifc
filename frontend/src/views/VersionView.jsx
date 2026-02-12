import { useTranslation } from '../i18n/useTranslation.jsx'

export default function VersionView({ data }) {
    const { t } = useTranslation()

    if (!data) return <div className="empty-state"><div className="empty-state-text">{t('loadFileFirst')}</div></div>

    return (
        <div className="animate-in">
            <div className="view-header">
                <h1 className="view-title">{t('versionTitle')}</h1>
                <p className="view-subtitle">{t('versionSubtitle')}</p>
            </div>

            <div className="card-grid card-grid-3">
                <div className="card">
                    <div className="card-label">{t('lblSchemaVersion')}</div>
                    <div className="card-value" style={{ fontSize: '28px', fontWeight: 800, color: 'var(--accent-teal)' }}>
                        {data.version_label || '—'}
                    </div>
                </div>
                <div className="card">
                    <div className="card-label">{t('lblSchema')}</div>
                    <div className="card-value mono">{data.schema_identifier || data.schema || '—'}</div>
                </div>
                <div className="card">
                    <div className="card-label">Schema ID</div>
                    <div className="card-value mono">{data.schema || '—'}</div>
                </div>
            </div>
        </div>
    )
}
