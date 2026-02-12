import { useTranslation } from '../i18n/useTranslation.jsx'

export default function HeaderView({ data }) {
    const { t } = useTranslation()

    if (!data) return <div className="empty-state"><div className="empty-state-text">{t('loadFileFirst')}</div></div>

    const fd = data.file_description || {}
    const fn = data.file_name || {}
    const fs = data.file_schema || {}

    return (
        <div className="animate-in">
            <div className="view-header">
                <h1 className="view-title">{t('headerTitle')}</h1>
                <p className="view-subtitle">{t('headerSubtitle')}</p>
            </div>

            {/* FILE_DESCRIPTION */}
            <div className="section-gap">
                <div className="card-grid card-grid-2">
                    <div className="card">
                        <div className="card-label">{t('lblFileDescription')}</div>
                        <div className="card-value mono">
                            {(fd.description || []).join('; ') || '—'}
                        </div>
                    </div>
                    <div className="card">
                        <div className="card-label">{t('lblImplLevel')}</div>
                        <div className="card-value mono">{fd.implementation_level || '—'}</div>
                    </div>
                </div>
            </div>

            {/* FILE_NAME */}
            <div className="section-gap">
                <div className="card-grid card-grid-2">
                    <div className="card">
                        <div className="card-label">{t('lblFileName')}</div>
                        <div className="card-value mono">{fn.name || '—'}</div>
                    </div>
                    <div className="card">
                        <div className="card-label">{t('lblTimeStamp')}</div>
                        <div className="card-value mono">{fn.time_stamp || '—'}</div>
                    </div>
                    <div className="card">
                        <div className="card-label">{t('lblAuthor')}</div>
                        <div className="card-value">{(fn.author || []).join(', ') || '—'}</div>
                    </div>
                    <div className="card">
                        <div className="card-label">{t('lblOrganization')}</div>
                        <div className="card-value">{(fn.organization || []).join(', ') || '—'}</div>
                    </div>
                    <div className="card">
                        <div className="card-label">{t('lblPreprocessor')}</div>
                        <div className="card-value mono">{fn.preprocessor_version || '—'}</div>
                    </div>
                    <div className="card">
                        <div className="card-label">{t('lblOriginatingSystem')}</div>
                        <div className="card-value mono">{fn.originating_system || '—'}</div>
                    </div>
                    <div className="card">
                        <div className="card-label">{t('lblAuthorization')}</div>
                        <div className="card-value">{fn.authorization || '—'}</div>
                    </div>
                </div>
            </div>

            {/* FILE_SCHEMA */}
            <div className="section-gap">
                <div className="card-grid card-grid-2">
                    <div className="card">
                        <div className="card-label">{t('lblSchema')}</div>
                        <div className="card-value mono">
                            {(fs.schema_identifiers || []).join(', ') || '—'}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
