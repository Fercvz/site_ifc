import { useTranslation } from '../i18n/useTranslation.jsx'

export default function UnitsView({ data }) {
    const { t } = useTranslation()

    if (!data || !data.length) return <div className="empty-state"><div className="empty-state-text">{t('loadFileFirst')}</div></div>

    return (
        <div className="animate-in">
            <div className="view-header">
                <h1 className="view-title">{t('unitsTitle')}</h1>
                <p className="view-subtitle">{t('unitsSubtitle')}</p>
            </div>

            <div className="table-container">
                <div className="table-scroll">
                    <table className="data-table">
                        <thead>
                            <tr>
                                <th>{t('lblUnitType')}</th>
                                <th>{t('lblUnitName')}</th>
                                <th>{t('lblUnitPrefix')}</th>
                                <th>STEP ID</th>
                                <th>IFC Type</th>
                            </tr>
                        </thead>
                        <tbody>
                            {data.map((unit, idx) => (
                                <tr key={idx}>
                                    <td style={{ fontWeight: 600, color: 'var(--text-primary)' }}>
                                        {unit.unit_type || '—'}
                                    </td>
                                    <td className="mono">{unit.name || '—'}</td>
                                    <td className="mono">{unit.prefix || '—'}</td>
                                    <td className="mono">#{unit.step_id || '—'}</td>
                                    <td className="mono" style={{ color: 'var(--text-muted)' }}>{unit.type || '—'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
