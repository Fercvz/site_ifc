import { useTranslation } from '../i18n/useTranslation.jsx'

export default function GeorefView({ data }) {
    const { t } = useTranslation()

    if (!data) return <div className="empty-state"><div className="empty-state-text">{t('loadFileFirst')}</div></div>

    const siteData = data.site_data
    const mapConversion = data.map_conversion
    const projectedCRS = data.projected_crs

    return (
        <div className="animate-in">
            <div className="view-header">
                <h1 className="view-title">{t('georefTitle')}</h1>
                <p className="view-subtitle">{t('georefSubtitle')}</p>
            </div>

            {/* Status */}
            <div className="section-gap">
                <div className="card-grid card-grid-2">
                    <div className="card">
                        <div className="card-label">{t('lblGeorefStatus')}</div>
                        <div style={{ marginTop: 4 }}>
                            <span className={`badge ${data.has_georef ? 'present' : 'absent'}`}>
                                {data.has_georef ? t('lblPresent') : t('lblAbsent')}
                            </span>
                        </div>
                    </div>
                    <div className="card">
                        <div className="card-label">Resumo</div>
                        <div className="card-value" style={{ fontSize: 12 }}>
                            {(data.summary || []).map((s, i) => (
                                <div key={i} style={{ marginBottom: 2 }}>
                                    {s.includes('presente') || s.includes('Present')
                                        ? <span style={{ color: 'var(--accent-green)' }}>✓ {s}</span>
                                        : s.includes('ausente') || s.includes('Absent')
                                            ? <span style={{ color: 'var(--accent-red)' }}>✗ {s}</span>
                                            : s
                                    }
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            <div className="georef-grid">
                {/* IfcSite */}
                {siteData && (
                    <div className="georef-card">
                        <div className="georef-card-title">🏗️ {t('lblSiteData')}</div>
                        <div className="georef-detail">
                            <span className="georef-detail-label">{t('lblName')}</span>
                            <span className="georef-detail-value">{siteData.name || '—'}</span>
                        </div>
                        <div className="georef-detail">
                            <span className="georef-detail-label">GlobalId</span>
                            <span className="georef-detail-value">{siteData.global_id || '—'}</span>
                        </div>
                        <div className="georef-detail">
                            <span className="georef-detail-label">STEP ID</span>
                            <span className="georef-detail-value">#{siteData.step_id || '—'}</span>
                        </div>
                        {siteData.ref_latitude && (
                            <div className="georef-detail">
                                <span className="georef-detail-label">RefLatitude</span>
                                <span className="georef-detail-value">{siteData.ref_latitude.join('° ')}</span>
                            </div>
                        )}
                        {siteData.ref_longitude && (
                            <div className="georef-detail">
                                <span className="georef-detail-label">RefLongitude</span>
                                <span className="georef-detail-value">{siteData.ref_longitude.join('° ')}</span>
                            </div>
                        )}
                        {siteData.ref_elevation != null && (
                            <div className="georef-detail">
                                <span className="georef-detail-label">RefElevation</span>
                                <span className="georef-detail-value">{siteData.ref_elevation}</span>
                            </div>
                        )}
                    </div>
                )}

                {/* MapConversion */}
                {mapConversion && (
                    <div className="georef-card">
                        <div className="georef-card-title">🗺️ {t('lblMapConversion')}</div>
                        {Object.entries(mapConversion).filter(([k]) => k !== 'step_id').map(([key, val]) => (
                            <div className="georef-detail" key={key}>
                                <span className="georef-detail-label">{key}</span>
                                <span className="georef-detail-value">{val != null ? String(val) : '—'}</span>
                            </div>
                        ))}
                        <div className="georef-detail">
                            <span className="georef-detail-label">STEP ID</span>
                            <span className="georef-detail-value">#{mapConversion.step_id || '—'}</span>
                        </div>
                    </div>
                )}

                {/* ProjectedCRS */}
                {projectedCRS && (
                    <div className="georef-card">
                        <div className="georef-card-title">📍 {t('lblProjectedCRS')}</div>
                        {Object.entries(projectedCRS).filter(([k]) => k !== 'step_id').map(([key, val]) => (
                            <div className="georef-detail" key={key}>
                                <span className="georef-detail-label">{key}</span>
                                <span className="georef-detail-value">{val || '—'}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}
