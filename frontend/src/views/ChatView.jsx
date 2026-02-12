import { useState, useRef, useEffect } from 'react'
import { useTranslation } from '../i18n/useTranslation.jsx'

const API_BASE = '/api'

function renderMarkdown(text) {
    if (!text) return null
    // Split into lines
    const lines = text.split('\n')
    return lines.map((line, i) => {
        // Process inline markdown
        let parts = []
        // Bold: **text**
        const regex = /(\*\*(.+?)\*\*)|(`(.+?)`)|(\*(.+?)\*)/g
        let lastIndex = 0
        let match
        let key = 0
        while ((match = regex.exec(line)) !== null) {
            // Add text before match
            if (match.index > lastIndex) {
                parts.push(line.slice(lastIndex, match.index))
            }
            if (match[1]) {
                // Bold
                parts.push(<strong key={key++}>{match[2]}</strong>)
            } else if (match[3]) {
                // Code
                parts.push(<code key={key++} style={{ background: 'rgba(255,255,255,0.1)', padding: '1px 4px', borderRadius: 3, fontSize: '0.9em' }}>{match[4]}</code>)
            } else if (match[5]) {
                // Italic
                parts.push(<em key={key++}>{match[6]}</em>)
            }
            lastIndex = match.index + match[0].length
        }
        if (lastIndex < line.length) {
            parts.push(line.slice(lastIndex))
        }
        if (parts.length === 0) parts.push('')
        return (
            <span key={i}>
                {i > 0 && <br />}
                {parts}
            </span>
        )
    })
}

export default function ChatView({ sessionId, ifcLoaded, messages, setMessages }) {
    const { t } = useTranslation()
    const [input, setInput] = useState('')
    const [loading, setLoading] = useState(false)
    const messagesEndRef = useRef(null)

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages])

    if (!ifcLoaded) {
        return (
            <div className="chat-container">
                <div className="chat-disabled">
                    <div className="chat-disabled-icon">🤖</div>
                    <div>{t('chatDisabled')}</div>
                </div>
            </div>
        )
    }

    const handleSend = async () => {
        if (!input.trim() || loading) return

        const userMsg = input.trim()
        setInput('')
        setMessages(prev => [...prev, { role: 'user', content: userMsg }])
        setLoading(true)

        try {
            const res = await fetch(`${API_BASE}/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ session_id: sessionId, message: userMsg }),
            })
            const data = await res.json()
            if (!res.ok) throw new Error(data.detail || 'Chat error')

            setMessages(prev => [...prev, {
                role: 'assistant',
                content: data.answer,
                sources: data.sources || [],
            }])
        } catch (err) {
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: `❌ ${err.message}`,
                sources: [],
            }])
        } finally {
            setLoading(false)
        }
    }

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSend()
        }
    }

    return (
        <div className="chat-container">
            <div className="chat-header">
                <span style={{ fontSize: 20 }}>🤖</span>
                <span className="chat-header-title">{t('chatTitle')}</span>
            </div>

            <div className="chat-messages">
                {messages.length === 0 && (
                    <div className="empty-state" style={{ padding: 40 }}>
                        <div className="empty-state-icon">💬</div>
                        <div className="empty-state-text">{t('chatPlaceholder')}</div>
                    </div>
                )}

                {messages.map((msg, idx) => (
                    <div key={idx} className={`chat-msg ${msg.role}`}>
                        <div>{renderMarkdown(msg.content)}</div>
                        {msg.sources && msg.sources.length > 0 && (
                            <div className="sources-section">
                                <div className="sources-title">{t('chatSources')}</div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                                    {msg.sources.map((src, si) => (
                                        <span key={si} className="source-tag">
                                            {src.entity} {src.guid ? `| ${src.guid.substring(0, 10)}...` : ''} {src.step_id ? `| #${src.step_id}` : ''}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                ))}

                {loading && (
                    <div className="chat-msg assistant">
                        <div className="spinner" style={{ width: 18, height: 18, borderWidth: 2 }}></div>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            <div className="chat-input-bar">
                <input
                    className="chat-input"
                    type="text"
                    placeholder={t('chatPlaceholder')}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={loading}
                />
                <button className="chat-send-btn" onClick={handleSend} disabled={loading || !input.trim()}>
                    {t('chatSend')}
                </button>
            </div>
        </div>
    )
}
