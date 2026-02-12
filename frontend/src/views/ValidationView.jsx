import { useState, useRef } from 'react'
import { useTranslation } from '../i18n/useTranslation.jsx'

const API_BASE = '/api'

export default function ValidationView({ sessionId }) {
    const { t } = useTranslation()
    const [loading, setLoading] = useState(false)
    const [results, setResults] = useState(null)
    const [issues, setIssues] = useState(null)
    const [issuesPage, setIssuesPage] = useState(1)
    const [issuesTotalPages, setIssuesTotalPages] = useState(1)
    const [error, setError] = useState(null)
    const [dragover, setDragover] = useState(false)
    const inputRef = useRef(null)

    const handleUpload = async (file) => {
        if (!file) return
        setLoading(true)
        setError(null)
        setResults(null)
        setIssues(null)

        const formData = new FormData()
        formData.append('file', file)

        try {
            const res = await fetch(`${API_BASE}/excel/upload?session_id=${sessionId}`, {
                method: 'POST',
                body: formData,
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.detail || 'Upload failed')

            // Fetch full summary
            const summaryRes = await fetch(`${API_BASE}/validation/summary?session_id=${sessionId}`)
            const summary = await summaryRes.json()

            // Fetch by-entity
            const entityRes = await fetch(`${API_BASE}/validation/by-entity?session_id=${sessionId}`)
            const byEntity = await entityRes.json()

            // Fetch by-property
            const propRes = await fetch(`${API_BASE}/validation/by-property?session_id=${sessionId}`)
            const byProperty = await propRes.json()

            // Fetch issues page 1
            const issuesRes = await fetch(`${API_BASE}/validation/issues?session_id=${sessionId}&page=1&page_size=50`)
            const issuesData = await issuesRes.json()

            setResults({
                summary: summary.summary,
                discipline: summary.discipline,
                stage: summary.stage,
                ifc_filename: summary.ifc_filename,
                byEntity,
                byProperty,
            })
            setIssues(issuesData.issues)
            setIssuesPage(1)
            setIssuesTotalPages(issuesData.total_pages)
        } catch (err) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }

    const loadIssuesPage = async (page) => {
        try {
            const res = await fetch(`${API_BASE}/validation/issues?session_id=${sessionId}&page=${page}&page_size=50`)
            const data = await res.json()
            setIssues(data.issues)
            setIssuesPage(page)
            setIssuesTotalPages(data.total_pages)
        } catch (err) {
            console.error(err)
        }
    }

    const handleDrop = (e) => {
        e.preventDefault()
        setDragover(false)
        const file = e.dataTransfer.files[0]
        if (file) handleUpload(file)
    }

    // No results yet — show upload zone
    if (!results && !loading) {
        return (
            <div className="animate-in">
                <div className="view-header">
                    <h1 className="view-title">{t('validationTitle')}</h1>
                    <p className="view-subtitle">{t('validationSubtitle')}</p>
                </div>

                {error && (
                    <div className="card" style={{ borderColor: 'var(--accent-red)', marginBottom: 20 }}>
                        <div className="card-label" style={{ color: 'var(--accent-red)' }}>{t('error')}</div>
                        <div className="card-value">{error}</div>
                    </div>
                )}

                <div className="validation-upload">
                    <div
                        className={`validation-upload-zone ${dragover ? 'dragover' : ''}`}
                        onDrop={handleDrop}
                        onDragOver={(e) => { e.preventDefault(); setDragover(true) }}
                        onDragLeave={() => setDragover(false)}
                        onClick={() => inputRef.current?.click()}
                    >
                        <div className="upload-icon">📊</div>
                        <div className="upload-title">{t('validationUploadTitle')}</div>
                        <div className="upload-subtitle">{t('validationUploadSubtitle')}</div>
                        <button className="upload-btn" style={{ background: 'var(--accent-amber)' }} onClick={(e) => { e.stopPropagation(); inputRef.current?.click() }}>
                            {t('uploadBtn')}
                        </button>
                        <input ref={inputRef} type="file" accept=".xlsx" style={{ display: 'none' }}
                            onChange={(e) => { handleUpload(e.target.files[0]); e.target.value = '' }} />
                    </div>
                </div>
            </div>
        )
    }

    if (loading) {
        return (
            <div className="loading-state">
                <div className="spinner"></div>
                <div className="loading-text">{t('uploadProcessing')}</div>
            </div>
        )
    }

    const s = results.summary
    const maxEntity = Object.values(results.byEntity).reduce((max, e) => Math.max(max, e.total), 1)
    const maxProp = Object.values(results.byProperty).reduce((max, p) => Math.max(max, p.total), 1)

    // Count by reason from issues
    const byReason = {}
    if (issues) {
        issues.forEach(i => { byReason[i.reason] = (byReason[i.reason] || 0) + 1 })
    }

    return (
        <div className="animate-in">
            <div className="view-header">
                <h1 className="view-title">{t('validationTitle')}</h1>
                <p className="view-subtitle">
                    {t('lblDiscipline')}: <strong>{results.discipline}</strong> | {t('lblStage')}: <strong>{results.stage}</strong>
                    {results.ifc_filename && (
                        <span style={{ marginLeft: 12, color: 'var(--accent-teal)' }}>📄 {results.ifc_filename}</span>
                    )}
                </p>
            </div>

            {/* KPI Cards */}
            <div className="section-gap">
                <div className="card-grid card-grid-4">
                    <div className="kpi-card success">
                        <div className="kpi-label">{t('lblCompliance')}</div>
                        <div className="kpi-value">{s.total_rules_applied > 0 ? Math.round(s.total_conformes / s.total_rules_applied * 1000) / 10 : 0}<span className="kpi-suffix">%</span></div>
                    </div>
                    <div className="kpi-card">
                        <div className="kpi-label">{t('lblTotalElements')}</div>
                        <div className="kpi-value small">{s.total_evaluated_elements}</div>
                    </div>
                    <div className="kpi-card">
                        <div className="kpi-label">{t('lblTotalRules')}</div>
                        <div className="kpi-value small">{s.total_rules_applied}</div>
                    </div>
                    <div className="kpi-card danger">
                        <div className="kpi-label">{t('lblNonConformities')}</div>
                        <div className="kpi-value small">{s.total_nao_conformes}</div>
                    </div>
                </div>
            </div>

            {/* Charts Row — Rules Donut + Elements Donut */}
            <div className="section-gap">
                <div className="card-grid card-grid-2">
                    {/* Donut — Regras Aplicadas */}
                    <div className="card">
                        <div className="card-label" style={{ marginBottom: 12 }}>{t('lblTotalRules')}</div>
                        <div className="donut-container">
                            {(() => {
                                const rulesPct = s.total_rules_applied > 0 ? Math.round(s.total_conformes / s.total_rules_applied * 1000) / 10 : 0
                                return (
                                    <>
                                        <svg className="donut-svg" viewBox="0 0 120 120">
                                            <circle className="donut-bg" cx="60" cy="60" r="50" />
                                            <circle className="donut-fill" cx="60" cy="60" r="50"
                                                strokeDasharray={`${rulesPct * 3.14} ${314 - rulesPct * 3.14}`}
                                                strokeDashoffset="0"
                                            />
                                            <text className="donut-center" x="60" y="60">{rulesPct}%</text>
                                        </svg>
                                    </>
                                )
                            })()}
                            <div className="donut-legend">
                                <div className="donut-legend-item">
                                    <div className="donut-legend-dot" style={{ background: 'var(--accent-teal)' }}></div>
                                    {t('lblConforme')}: {s.total_conformes}
                                </div>
                                <div className="donut-legend-item">
                                    <div className="donut-legend-dot" style={{ background: 'var(--accent-red)' }}></div>
                                    {t('lblNaoConforme')}: {s.total_nao_conformes}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Donut — Por Elementos */}
                    <div className="card">
                        <div className="card-label" style={{ marginBottom: 12 }}>{t('lblByElement')}</div>
                        {(() => {
                            const totalElem = s.total_evaluated_elements || 1
                            const elemConformes = s.total_conforme_elements != null ? s.total_conforme_elements : (totalElem - (s.total_nao_conforme_elements || 0))
                            const elemNaoConformes = s.total_nao_conforme_elements || (totalElem - elemConformes)
                            const elemPct = Math.round(elemConformes / totalElem * 100)
                            return (
                                <div className="donut-container">
                                    <svg className="donut-svg" viewBox="0 0 120 120">
                                        <circle className="donut-bg" cx="60" cy="60" r="50" />
                                        <circle className="donut-fill" cx="60" cy="60" r="50"
                                            stroke="var(--accent-amber)"
                                            strokeDasharray={`${elemPct * 3.14} ${314 - elemPct * 3.14}`}
                                            strokeDashoffset="0"
                                        />
                                        <text className="donut-center" x="60" y="60">{elemPct}%</text>
                                    </svg>
                                    <div className="donut-legend">
                                        <div className="donut-legend-item">
                                            <div className="donut-legend-dot" style={{ background: 'var(--accent-amber)' }}></div>
                                            {t('lblElemConformes')}: {elemConformes}
                                        </div>
                                        <div className="donut-legend-item">
                                            <div className="donut-legend-dot" style={{ background: 'var(--accent-red)' }}></div>
                                            {t('lblElemNaoConformes')}: {elemNaoConformes}
                                        </div>
                                        <div className="donut-legend-item" style={{ color: 'var(--text-muted)', fontSize: 11 }}>
                                            Total: {totalElem} {t('lblTotalElements').toLowerCase()}
                                        </div>
                                    </div>
                                </div>
                            )
                        })()}
                    </div>
                </div>
            </div>

            {/* By Entity */}
            <div className="section-gap">
                <div className="card" style={{ padding: 24 }}>
                    <div className="card-label" style={{ marginBottom: 16 }}>{t('lblByEntity')}</div>
                    <div className="bar-chart">
                        {Object.entries(results.byEntity).map(([entity, data]) => {
                            const pct = data.total > 0 ? Math.round(data.conforme / data.total * 100) : 0
                            return (
                                <div className="bar-row" key={entity}>
                                    <div className="bar-label" title={entity}>{entity}</div>
                                    <div className="bar-track">
                                        <div className="bar-fill green" style={{ width: `${pct}%` }}>
                                            {pct > 15 ? `${pct}%` : ''}
                                        </div>
                                    </div>
                                    <div className="bar-value">{pct}%</div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            </div>

            {/* By Property */}
            <div className="section-gap">
                <div className="card" style={{ padding: 24 }}>
                    <div className="card-label" style={{ marginBottom: 16 }}>{t('lblByProperty')}</div>
                    <div className="bar-chart">
                        {Object.entries(results.byProperty)
                            .sort(([, a], [, b]) => b.nao_conforme - a.nao_conforme)
                            .slice(0, 15)
                            .map(([prop, data]) => {
                                const pct = data.total > 0 ? Math.round(data.nao_conforme / data.total * 100) : 0
                                return (
                                    <div className="bar-row" key={prop}>
                                        <div className="bar-label" title={prop}>{prop}</div>
                                        <div className="bar-track">
                                            {pct > 0 && (
                                                <div className="bar-fill red" style={{ width: `${pct}%` }}>
                                                    {pct > 15 ? `${pct}%` : ''}
                                                </div>
                                            )}
                                        </div>
                                        <div className="bar-value">{data.nao_conforme}</div>
                                    </div>
                                )
                            })}
                    </div>
                </div>
            </div>

            {/* Export + Issues Table */}
            <div className="section-gap">
                <div className="export-bar">
                    <a className="btn" href={`${API_BASE}/validation/export.csv?session_id=${sessionId}`} download>
                        📄 {t('lblExportCSV')}
                    </a>
                    <a className="btn" href={`${API_BASE}/validation/export.xlsx?session_id=${sessionId}`} download>
                        📊 {t('lblExportExcel')}
                    </a>
                    <button className="btn" onClick={() => { setResults(null); setIssues(null); setError(null) }}>
                        🔄 {t('validationUploadTitle')}
                    </button>
                </div>

                <div className="table-container">
                    <div className="table-header">
                        <div className="table-title">{t('lblIssuesTable')} ({s.total_nao_conformes})</div>
                    </div>
                    <div className="table-scroll">
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>{t('lblGuid')}</th>
                                    <th>{t('lblStepId')}</th>
                                    <th>{t('lblEntity')}</th>
                                    <th>{t('lblName')}</th>
                                    <th>{t('lblPset')}</th>
                                    <th>{t('lblProperty')}</th>
                                    <th>{t('lblExpected')}</th>
                                    <th>{t('lblActual')}</th>
                                    <th>{t('lblReason')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {(issues || []).map((iss, idx) => (
                                    <tr key={idx}>
                                        <td className="mono" style={{ fontSize: 11 }}>{iss.global_id}</td>
                                        <td className="mono">#{iss.step_id}</td>
                                        <td>{iss.entity_type}</td>
                                        <td>{iss.name}</td>
                                        <td className="mono">{iss.pset}</td>
                                        <td>{iss.property}</td>
                                        <td className="mono">{iss.expected}</td>
                                        <td className="mono">{iss.actual || '—'}</td>
                                        <td><span className="badge nao-conforme">{iss.reason}</span></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>

                    {issuesTotalPages > 1 && (
                        <div className="pagination">
                            <button className="pagination-btn" disabled={issuesPage <= 1} onClick={() => loadIssuesPage(issuesPage - 1)}>
                                {t('lblPrev')}
                            </button>
                            <span className="pagination-info">
                                {t('lblPage')} {issuesPage} {t('lblOf')} {issuesTotalPages}
                            </span>
                            <button className="pagination-btn" disabled={issuesPage >= issuesTotalPages} onClick={() => loadIssuesPage(issuesPage + 1)}>
                                {t('lblNext')}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
