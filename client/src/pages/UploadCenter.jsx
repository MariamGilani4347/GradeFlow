import { useState, useRef } from 'react'
import { useAuth } from '../context/AuthContext'
import { Upload, X, Loader, FileText, Image, CheckCircle, AlertCircle, Play } from 'lucide-react'

const ACCEPTED_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg']
const ACCEPTED_EXT = ['.pdf', '.jpg', '.jpeg', '.png']

function getFileIcon(file) {
  if (file.type === 'application/pdf') return <FileText size={18} color="#ef4444" />
  return <Image size={18} color="#2563eb" />
}

function formatSize(bytes) {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

export default function UploadCenter({ session, onClose }) {
  const { accessToken } = useAuth()
  const [files, setFiles] = useState([])
  const [dragging, setDragging] = useState(false)
  const [gradingStarted, setGradingStarted] = useState(false)
  const fileInputRef = useRef()

  const addFiles = (newFiles) => {
    const valid = Array.from(newFiles).filter(f =>
      ACCEPTED_TYPES.includes(f.type) ||
      ACCEPTED_EXT.some(ext => f.name.toLowerCase().endsWith(ext))
    )
    const invalid = Array.from(newFiles).length - valid.length
    if (invalid > 0) alert(`${invalid} file(s) skipped — only PDF, JPG, PNG supported.`)

    const fileObjects = valid.map(file => ({
      id: Math.random().toString(36).slice(2),
      file,
      name: file.name,
      size: formatSize(file.size),
      type: file.type,
      status: 'pending', // pending | uploading | done | error
      progress: 0,
      error: null,
    }))
    setFiles(prev => [...prev, ...fileObjects])
  }

  const removeFile = (id) => {
    setFiles(prev => prev.filter(f => f.id !== id))
  }

  const uploadFile = async (fileObj) => {
    // Simulate gradual progress
    const tickProgress = (target) => {
      setFiles(prev => prev.map(f => f.id === fileObj.id ? { ...f, progress: target } : f))
    }

    setFiles(prev => prev.map(f => f.id === fileObj.id ? { ...f, status: 'uploading', progress: 5 } : f))

    try {
      // Step 1 — Get presigned URL
      tickProgress(15)
      const presignRes = await fetch(`/api/sessions/${session.id}/presign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ file_name: fileObj.name, content_type: fileObj.file.type || 'application/octet-stream' })
      })
      const presignData = await presignRes.json()
      if (!presignRes.ok) throw new Error(presignData.error || 'Presign failed')
      const { upload_url, file_key, file_url } = presignData.data
      tickProgress(30)

      // Step 2 — Upload to Supabase storage
      const uploadRes = await fetch(upload_url, {
        method: 'PUT',
        headers: { 'Content-Type': fileObj.file.type || 'application/octet-stream' },
        body: fileObj.file,
      })
      if (!uploadRes.ok) throw new Error('Storage upload failed')
      tickProgress(70)

      // Step 3 — Register submission
      const subRes = await fetch(`/api/sessions/${session.id}/submissions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ file_url, file_key, file_name: fileObj.name })
      })
      const subData = await subRes.json()
      if (!subRes.ok) throw new Error(subData.error || 'Registration failed')
      tickProgress(100)

      setFiles(prev => prev.map(f => f.id === fileObj.id ? { ...f, status: 'done', progress: 100 } : f))
    } catch (err) {
      setFiles(prev => prev.map(f => f.id === fileObj.id ? { ...f, status: 'error', error: err.message, progress: 0 } : f))
    }
  }

  const handleStartGrading = async () => {
    setGradingStarted(true)
    const pending = files.filter(f => f.status === 'pending')
    await Promise.all(pending.map(uploadFile))
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragging(false)
    addFiles(e.dataTransfer.files)
  }

  const pendingCount = files.filter(f => f.status === 'pending').length
  const doneCount = files.filter(f => f.status === 'done').length
  const errorCount = files.filter(f => f.status === 'error').length
  const uploadingCount = files.filter(f => f.status === 'uploading').length
  const allDone = files.length > 0 && doneCount === files.length
  const hasFiles = files.length > 0

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(160deg, #C7EABB 0%, #dff0d4 100%)',
      fontFamily: "'Segoe UI', sans-serif",
      padding: '32px 24px',
    }}>
      <div style={{ maxWidth: 680, margin: '0 auto' }}>

        {/* Back Button */}
        <button onClick={onClose} style={{
          marginBottom: 24, padding: '8px 16px', borderRadius: 10,
          border: 'none', background: 'rgba(255,255,255,0.7)',
          fontWeight: 600, cursor: 'pointer', color: '#0f172a',
          fontSize: 13, display: 'flex', alignItems: 'center', gap: 6,
          backdropFilter: 'blur(8px)', border: '1px solid rgba(0,0,0,0.07)',
        }}>
          ← Back
        </button>

        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', margin: '0 0 4px 0' }}>
            Upload Answer Sheets
          </h1>
          <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>
            Session: <span style={{ fontWeight: 600, color: '#0f172a' }}>{session.title}</span>
          </p>
        </div>

        {/* Drop Zone */}
        <div
          onDragOver={e => { e.preventDefault(); setDragging(true) }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current.click()}
          style={{
            border: `2.5px dashed ${dragging ? 'rgb(132,177,121)' : '#94a3b8'}`,
            borderRadius: 20,
            padding: '56px 32px',
            textAlign: 'center',
            background: dragging ? 'rgba(132,177,121,0.08)' : 'rgba(255,255,255,0.7)',
            cursor: 'pointer',
            marginBottom: 24,
            transition: 'all 0.2s ease',
            backdropFilter: 'blur(8px)',
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={e => addFiles(e.target.files)}
            style={{ display: 'none' }}
          />

          {/* Upload Icon */}
          <div style={{
            width: 64, height: 64, borderRadius: 18,
            background: dragging ? 'rgb(132,177,121)' : 'rgba(132,177,121,0.15)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 16px', transition: 'all 0.2s',
          }}>
            <Upload size={28} color={dragging ? '#fff' : 'rgb(132,177,121)'} />
          </div>

          <div style={{ fontSize: 16, fontWeight: 700, color: '#0f172a', marginBottom: 6 }}>
            {dragging ? 'Drop files here' : 'Drag & drop files here, or click to browse'}
          </div>
          <div style={{ fontSize: 13, color: '#64748b', marginBottom: 12 }}>
            Upload student answer sheets for AI grading
          </div>

          {/* File type badges */}
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8 }}>
            {['PDF', 'JPG', 'PNG'].map(type => (
              <span key={type} style={{
                fontSize: 11, fontWeight: 700, padding: '3px 10px',
                borderRadius: 999, background: 'rgba(0,0,0,0.06)', color: '#64748b',
              }}>
                {type}
              </span>
            ))}
          </div>
        </div>

        {/* Stats row */}
        {hasFiles && (
          <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
            {[
              { label: 'Total', val: files.length, color: '#0f172a' },
              { label: 'Pending', val: pendingCount, color: '#f59e0b' },
              { label: 'Uploading', val: uploadingCount, color: '#2563eb' },
              { label: 'Done', val: doneCount, color: '#16a34a' },
              ...(errorCount > 0 ? [{ label: 'Failed', val: errorCount, color: '#ef4444' }] : []),
            ].map(s => (
              <div key={s.label} style={{
                background: 'rgba(255,255,255,0.7)', borderRadius: 10,
                padding: '6px 14px', fontSize: 12, fontWeight: 600,
                color: s.color, border: '1px solid rgba(0,0,0,0.06)',
              }}>
                {s.val} {s.label}
              </div>
            ))}
          </div>
        )}

        {/* File List */}
        {files.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 24 }}>
            {files.map(f => (
              <FileRow key={f.id} f={f} onRemove={removeFile} getFileIcon={getFileIcon} />
            ))}
          </div>
        )}

        {/* Start Grading Button */}
        <button
          onClick={handleStartGrading}
          disabled={!hasFiles || gradingStarted || allDone || pendingCount === 0}
          style={{
            width: '100%', padding: '16px',
            borderRadius: 14, border: 'none',
            background: (!hasFiles || pendingCount === 0)
              ? '#e2e8f0'
              : allDone
              ? '#16a34a'
              : 'rgb(132,177,121)',
            color: (!hasFiles || pendingCount === 0) ? '#94a3b8' : '#fff',
            fontSize: 15, fontWeight: 700,
            cursor: (!hasFiles || pendingCount === 0) ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
            transition: 'all 0.2s',
            boxShadow: hasFiles && pendingCount > 0 ? '0 4px 14px rgba(132,177,121,0.4)' : 'none',
          }}
        >
          {allDone ? (
            <><CheckCircle size={18} /> All files uploaded — grading in progress</>
          ) : uploadingCount > 0 ? (
            <><Loader size={18} style={{ animation: 'spin 1s linear infinite' }} /> Uploading {uploadingCount} file{uploadingCount > 1 ? 's' : ''}...</>
          ) : (
            <><Play size={18} /> Start Grading {pendingCount > 0 ? `(${pendingCount} file${pendingCount > 1 ? 's' : ''})` : ''}</>
          )}
        </button>

        {allDone && (
          <p style={{ textAlign: 'center', fontSize: 13, color: '#16a34a', marginTop: 12, fontWeight: 600 }}>
            ✓ All files submitted. AI grading has started — check back in a few minutes.
          </p>
        )}

        <style>{`
          @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        `}</style>
      </div>
    </div>
  )
}

// ─── File Row ─────────────────────────────────────────────────────────────────
function FileRow({ f, onRemove, getFileIcon }) {
  const statusConfig = {
    pending:   { color: '#94a3b8', label: 'Ready' },
    uploading: { color: '#2563eb', label: 'Uploading...' },
    done:      { color: '#16a34a', label: 'Done' },
    error:     { color: '#ef4444', label: 'Failed' },
  }
  const cfg = statusConfig[f.status]

  return (
    <div style={{
      background: f.status === 'error' ? '#fff1f2' : 'rgba(255,255,255,0.85)',
      borderRadius: 14,
      padding: '14px 16px',
      border: `1px solid ${f.status === 'error' ? '#fca5a5' : f.status === 'done' ? '#bbf7d0' : 'rgba(0,0,0,0.07)'}`,
      backdropFilter: 'blur(8px)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {/* Icon */}
        <div style={{
          width: 38, height: 38, borderRadius: 10, flexShrink: 0,
          background: f.status === 'done' ? '#dcfce7' : '#f8fafc',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          border: '1px solid rgba(0,0,0,0.06)',
        }}>
          {f.status === 'done'
            ? <CheckCircle size={18} color="#16a34a" />
            : f.status === 'error'
            ? <AlertCircle size={18} color="#ef4444" />
            : f.status === 'uploading'
            ? <Loader size={18} color="#2563eb" style={{ animation: 'spin 1s linear infinite' }} />
            : getFileIcon(f.file)
          }
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '60%' }}>
              {f.name}
            </span>
            <span style={{ fontSize: 11, color: cfg.color, fontWeight: 600, marginLeft: 8 }}>
              {f.status === 'error' ? f.error : cfg.label}
            </span>
          </div>

          {/* Progress bar */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ flex: 1, height: 5, background: '#f1f5f9', borderRadius: 999, overflow: 'hidden' }}>
              <div style={{
                height: '100%',
                width: `${f.progress}%`,
                borderRadius: 999,
                background: f.status === 'error' ? '#ef4444' : f.status === 'done' ? '#16a34a' : 'rgb(132,177,121)',
                transition: 'width 0.3s ease',
              }} />
            </div>
            <span style={{ fontSize: 11, color: '#94a3b8', minWidth: 32, textAlign: 'right' }}>
              {f.status === 'uploading' ? `${f.progress}%` : f.size}
            </span>
          </div>
        </div>

        {/* Remove button */}
        {(f.status === 'pending' || f.status === 'error') && (
          <button
            onClick={() => onRemove(f.id)}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: '#94a3b8', padding: 4, borderRadius: 6,
              display: 'flex', alignItems: 'center',
            }}
            onMouseEnter={e => e.currentTarget.style.color = '#ef4444'}
            onMouseLeave={e => e.currentTarget.style.color = '#94a3b8'}
          >
            <X size={15} />
          </button>
        )}
      </div>
    </div>
  )
}