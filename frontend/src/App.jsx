import { useState, useCallback, useRef } from 'react'
import Sidebar from './components/Sidebar.jsx'
import UploadZone from './components/UploadZone.jsx'
import HeaderView from './views/HeaderView.jsx'
import VersionView from './views/VersionView.jsx'
import UnitsView from './views/UnitsView.jsx'
import GeorefView from './views/GeorefView.jsx'
import DictionaryView from './views/DictionaryView.jsx'
import ValidationView from './views/ValidationView.jsx'
import ChatView from './views/ChatView.jsx'

const API_BASE = import.meta.env.VITE_API_URL || '/api'

export default function App() {
    const [activeView, setActiveView] = useState('upload')
    const [sessionId, setSessionId] = useState(null)
    const [ifcLoaded, setIfcLoaded] = useState(false)
    const [fileName, setFileName] = useState(null)
    const [fileStatus, setFileStatus] = useState(null) // 'running' | 'done' | 'error'
    const [progress, setProgress] = useState(0)
    const [statusMessage, setStatusMessage] = useState('')
    const [ifcData, setIfcData] = useState({})
    const [chatMessages, setChatMessages] = useState([])
    const pollRef = useRef(null)

    const handleUpload = useCallback(async (file) => {
        setFileStatus('running')
        setProgress(5)
        setStatusMessage('Enviando arquivo...')
        setFileName(file.name)
        setIfcLoaded(false)
        setIfcData({})
        setChatMessages([])

        const formData = new FormData()
        formData.append('file', file)
        const url = sessionId
            ? `${API_BASE}/ifc/upload?session_id=${sessionId}`
            : `${API_BASE}/ifc/upload`

        try {
            const res = await fetch(url, { method: 'POST', body: formData })
            const data = await res.json()
            if (!res.ok) throw new Error(data.detail || 'Upload failed')

            setSessionId(data.session_id)
            setProgress(10)

            // Poll job status
            const pollJob = async () => {
                try {
                    const jr = await fetch(`${API_BASE}/job/${data.job_id}?session_id=${data.session_id}`)
                    const job = await jr.json()

                    setProgress(job.progress || 10)
                    setStatusMessage(job.message || '')

                    if (job.status === 'done') {
                        setFileStatus('done')
                        setIfcLoaded(true)
                        setProgress(100)
                        // Load all analysis data
                        await loadAnalysisData(data.session_id)
                        setActiveView('header')
                    } else if (job.status === 'error') {
                        setFileStatus('error')
                        setStatusMessage(job.message || 'Erro')
                    } else {
                        pollRef.current = setTimeout(pollJob, 1000)
                    }
                } catch (err) {
                    setFileStatus('error')
                    setStatusMessage(err.message)
                }
            }

            pollRef.current = setTimeout(pollJob, 500)
        } catch (err) {
            setFileStatus('error')
            setStatusMessage(err.message)
        }
    }, [sessionId])

    const loadAnalysisData = async (sid) => {
        try {
            const [headerRes, versionRes, unitsRes, georefRes] = await Promise.all([
                fetch(`${API_BASE}/ifc/header?session_id=${sid}`),
                fetch(`${API_BASE}/ifc/version?session_id=${sid}`),
                fetch(`${API_BASE}/ifc/units?session_id=${sid}`),
                fetch(`${API_BASE}/ifc/georef?session_id=${sid}`),
            ])

            const header = await headerRes.json()
            const version = await versionRes.json()
            const units = await unitsRes.json()
            const georef = await georefRes.json()

            setIfcData({ header, version, units, georef })
        } catch (err) {
            console.error('Failed to load analysis data:', err)
        }
    }

    const renderView = () => {
        if (!ifcLoaded && activeView !== 'upload' && activeView !== 'dictionary') {
            return (
                <UploadZone
                    onUpload={handleUpload}
                    isProcessing={fileStatus === 'running'}
                    progress={progress}
                    statusMessage={statusMessage}
                />
            )
        }

        switch (activeView) {
            case 'upload':
                return (
                    <UploadZone
                        onUpload={handleUpload}
                        isProcessing={fileStatus === 'running'}
                        progress={progress}
                        statusMessage={statusMessage}
                    />
                )
            case 'dictionary':
                return <DictionaryView />
            case 'header':
                return <HeaderView data={ifcData.header} />
            case 'version':
                return <VersionView data={ifcData.version} />
            case 'units':
                return <UnitsView data={ifcData.units} />
            case 'georef':
                return <GeorefView data={ifcData.georef} />
            case 'validation':
                return <ValidationView sessionId={sessionId} />
            case 'chat':
                return <ChatView sessionId={sessionId} ifcLoaded={ifcLoaded} messages={chatMessages} setMessages={setChatMessages} />
            default:
                return <UploadZone onUpload={handleUpload} isProcessing={false} progress={0} statusMessage="" />
        }
    }

    return (
        <div className="app-layout">
            <Sidebar
                activeView={activeView}
                onViewChange={setActiveView}
                ifcLoaded={ifcLoaded}
                fileName={fileName}
                fileStatus={fileStatus}
            />
            <main className="main-content">
                {renderView()}
            </main>
        </div>
    )
}
