import { useState, useRef } from 'react'
import { useTranslation } from '../i18n/useTranslation.jsx'

export default function UploadZone({ onUpload, isProcessing, progress, statusMessage }) {
    const { t } = useTranslation()
    const [dragover, setDragover] = useState(false)
    const inputRef = useRef(null)

    const handleDrop = (e) => {
        e.preventDefault()
        setDragover(false)
        const file = e.dataTransfer.files[0]
        if (file && file.name.toLowerCase().endsWith('.ifc')) {
            onUpload(file)
        }
    }

    const handleDragOver = (e) => {
        e.preventDefault()
        setDragover(true)
    }

    const handleDragLeave = () => setDragover(false)

    const handleFileSelect = (e) => {
        const file = e.target.files[0]
        if (file) onUpload(file)
        e.target.value = ''
    }

    if (isProcessing) {
        return (
            <div className="upload-zone-wrapper animate-in">
                <div className="upload-zone">
                    <div className="upload-progress">
                        <div className="spinner" style={{ margin: '0 auto 16px' }}></div>
                        <div className="upload-title">{t('uploadProcessing')}</div>
                        <div className="progress-bar-container">
                            <div className="progress-bar" style={{ width: `${progress}%` }}></div>
                        </div>
                        <div className="progress-text">{statusMessage || `${progress}%`}</div>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="upload-zone-wrapper animate-in">
            <div
                className={`upload-zone ${dragover ? 'dragover' : ''}`}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onClick={() => inputRef.current?.click()}
            >
                <div className="upload-icon">📂</div>
                <div className="upload-title">{t('uploadTitle')}</div>
                <div className="upload-subtitle">{t('uploadSubtitle')}</div>
                <button className="upload-btn" onClick={(e) => { e.stopPropagation(); inputRef.current?.click() }}>
                    {t('uploadBtn')}
                </button>
                <div className="upload-hint">{t('uploadHint')}</div>
                <input
                    ref={inputRef}
                    type="file"
                    accept=".ifc"
                    style={{ display: 'none' }}
                    onChange={handleFileSelect}
                />
            </div>
        </div>
    )
}
