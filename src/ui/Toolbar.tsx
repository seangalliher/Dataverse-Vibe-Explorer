import { useCallback, useEffect, useState, useRef } from 'react'
import { useAppStore } from '@/store/appStore'
import { configureDataverse, refreshRecordCounts, getWebApiStatus, getCurrentUser, getConfig } from '@/data/dataverse'
import { loadUserPreferences, saveUserPreferences, saveOrgUrl, type UserPreferences } from '@/data/cacheService'
import type { CDMDomain } from '@/utils/colors'

interface AccessibilityState {
  highContrast: boolean
  reducedMotion: boolean
}

export function Toolbar() {
  const [a11y, setA11y] = useState<AccessibilityState>({
    highContrast: false,
    reducedMotion: window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false,
  })
  const [expanded, setExpanded] = useState(false)
  const [orgUrl, setOrgUrl] = useState(() => {
    // Prefer auto-detected org URL, fall back to localStorage
    const detected = getConfig().orgUrl
    if (detected) return detected
    try { return localStorage.getItem('dve-orgUrl') ?? '' } catch { return '' }
  })
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'testing' | 'connected' | 'failed'>('idle')
  const [refreshing, setRefreshing] = useState(false)
  const prefsRef = useRef<UserPreferences | null>(null)
  const initialApplyDone = useRef(false)

  const tables = useAppStore((s) => s.tables)
  const updateTableCounts = useAppStore((s) => s.updateTableCounts)
  const applyPreferences = useAppStore((s) => s.applyPreferences)
  const preferencesLoaded = useAppStore((s) => s.preferencesLoaded)
  const visibleDomains = useAppStore((s) => s.visibleDomains)
  const hiddenTableIds = useAppStore((s) => s.hiddenTableIds)

  // Load preferences from Dataverse on mount
  useEffect(() => {
    if (preferencesLoaded) return
    const user = getCurrentUser()
    if (!user) return

    loadUserPreferences(user.id).then((prefs) => {
      prefsRef.current = prefs
      applyPreferences(prefs)
      initialApplyDone.current = true
      // Sync local UI state from loaded preferences
      // Org URL comes from org-wide config (loaded in World.tsx), prefer that
      const storeOrgUrl = useAppStore.getState().orgUrl
      if (storeOrgUrl) {
        setOrgUrl(storeOrgUrl)
      } else if (prefs.orgUrl) {
        setOrgUrl(prefs.orgUrl)
      }
      if (prefs.highContrast || prefs.reducedMotion) {
        setA11y({ highContrast: prefs.highContrast, reducedMotion: prefs.reducedMotion })
        document.documentElement.setAttribute('data-high-contrast', String(prefs.highContrast))
        document.documentElement.setAttribute('data-reduced-motion', String(prefs.reducedMotion))
      }
    })
  }, [preferencesLoaded, applyPreferences])

  // Save preferences to Dataverse (debounced helper)
  const savePrefs = useCallback((updates: Partial<UserPreferences>) => {
    const user = getCurrentUser()
    if (!user) return
    const current = prefsRef.current ?? {
      orgUrl: '',
      hiddenDomains: [],
      hiddenTableIds: [],
      highContrast: false,
      reducedMotion: false,
      extra: {},
    }
    const merged = { ...current, ...updates }
    prefsRef.current = merged
    saveUserPreferences(user.id, user.displayName, merged).catch(() => {})
  }, [])

  const toggleHighContrast = useCallback(() => {
    setA11y((prev) => {
      const next = { ...prev, highContrast: !prev.highContrast }
      document.documentElement.setAttribute('data-high-contrast', String(next.highContrast))
      savePrefs({ highContrast: next.highContrast })
      return next
    })
  }, [savePrefs])

  const toggleReducedMotion = useCallback(() => {
    setA11y((prev) => {
      const next = { ...prev, reducedMotion: !prev.reducedMotion }
      document.documentElement.setAttribute('data-reduced-motion', String(next.reducedMotion))
      savePrefs({ reducedMotion: next.reducedMotion })
      return next
    })
  }, [savePrefs])

  const handleOrgUrlConnect = useCallback(async () => {
    const trimmed = orgUrl.trim().replace(/\/+$/, '')
    if (!trimmed) return

    // Save and configure
    try { localStorage.setItem('dve-orgUrl', trimmed) } catch { /* ignore */ }
    configureDataverse({ orgUrl: trimmed })
    useAppStore.getState().setOrgUrl(trimmed)
    // Save org-wide so all users in this org get it automatically
    saveOrgUrl(trimmed).catch(() => {})

    setConnectionStatus('testing')
    setRefreshing(true)

    const tableData = tables.map((t) => ({ logicalName: t.name, entitySetName: t.name + 's' }))
    const counts = await refreshRecordCounts(tableData)

    const status = getWebApiStatus()
    if (status === 'available' && counts.size > 0) {
      updateTableCounts(counts)
      setConnectionStatus('connected')
    } else {
      setConnectionStatus('failed')
    }
    setRefreshing(false)
  }, [orgUrl, tables, updateTableCounts, savePrefs])

  // Save domain/table visibility changes to Dataverse
  useEffect(() => {
    if (!preferencesLoaded || !initialApplyDone.current) return
    const allDomains = new Set(['Core', 'Sales', 'Service', 'Marketing', 'Field Service', 'Project', 'Finance', 'HR', 'Custom', 'Platform', 'AI', 'Other'])
    const hidden = [...allDomains].filter((d) => !visibleDomains.has(d as CDMDomain))
    savePrefs({
      hiddenDomains: hidden,
      hiddenTableIds: [...hiddenTableIds],
    })
  }, [visibleDomains, hiddenTableIds, preferencesLoaded, savePrefs])

  const orgUrlConfigured = !!getConfig().orgUrl

  const statusColor =
    connectionStatus === 'connected' ? '#00ff88'
    : connectionStatus === 'failed' ? '#ff6b6b'
    : connectionStatus === 'testing' ? '#ffcc00'
    : '#64748b'

  const statusText =
    connectionStatus === 'connected' ? 'Live counts active'
    : connectionStatus === 'failed' ? 'CORS blocked — using estimates'
    : connectionStatus === 'testing' ? 'Testing...'
    : ''

  return (
    <div
      style={{
        position: 'fixed',
        top: '1rem',
        right: '1rem',
        zIndex: 50,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        gap: '6px',
      }}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        style={toolbarBtnStyle}
        title="Settings"
        aria-label="Toggle settings panel"
      >
        &#x2699;
      </button>

      {expanded && (
        <div
          style={{
            background: 'rgba(8, 8, 24, 0.9)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(0, 240, 255, 0.15)',
            borderRadius: '10px',
            padding: '10px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            animation: 'fadeIn 0.2s ease-out',
            minWidth: '220px',
          }}
        >
          <ToggleOption
            label="High Contrast"
            enabled={a11y.highContrast}
            onToggle={toggleHighContrast}
          />
          <ToggleOption
            label="Reduce Motion"
            enabled={a11y.reducedMotion}
            onToggle={toggleReducedMotion}
          />

          {/* Org URL Section */}
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '8px', marginTop: '2px' }}>
            <label style={{ color: '#94a3b8', fontSize: '0.6rem', display: 'block', marginBottom: '4px' }}>
              Dataverse Org URL{orgUrlConfigured && <span style={{ color: '#00ff88', marginLeft: '4px' }}>(shared)</span>}
            </label>
            <div style={{ display: 'flex', gap: '4px' }}>
              <input
                type="url"
                value={orgUrl}
                onChange={(e) => setOrgUrl(e.target.value)}
                placeholder="https://org.crm.dynamics.com"
                style={{
                  flex: 1,
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(0, 240, 255, 0.15)',
                  borderRadius: '6px',
                  color: '#e2e8f0',
                  fontSize: '0.6rem',
                  padding: '4px 6px',
                  outline: 'none',
                  minWidth: 0,
                }}
                onKeyDown={(e) => { if (e.key === 'Enter') handleOrgUrlConnect() }}
              />
              <button
                onClick={handleOrgUrlConnect}
                disabled={refreshing || !orgUrl.trim()}
                style={{
                  ...toolbarSmallBtnStyle,
                  opacity: refreshing || !orgUrl.trim() ? 0.4 : 1,
                }}
                title="Connect and fetch live record counts"
              >
                {refreshing ? '...' : 'Go'}
              </button>
            </div>
            {statusText && (
              <div style={{ color: statusColor, fontSize: '0.55rem', marginTop: '4px' }}>
                {statusText}
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}

function ToggleOption({
  label,
  enabled,
  onToggle,
}: {
  label: string
  enabled: boolean
  onToggle: () => void
}) {
  return (
    <button
      onClick={onToggle}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        background: 'none',
        border: 'none',
        color: '#e2e8f0',
        cursor: 'pointer',
        fontSize: '0.7rem',
        padding: '4px 2px',
        textAlign: 'left',
      }}
      role="switch"
      aria-checked={enabled}
    >
      <span
        style={{
          width: '28px',
          height: '14px',
          borderRadius: '7px',
          background: enabled ? 'rgba(0, 240, 255, 0.4)' : 'rgba(255,255,255,0.1)',
          position: 'relative',
          transition: 'background 0.2s',
          flexShrink: 0,
        }}
      >
        <span
          style={{
            position: 'absolute',
            top: '2px',
            left: enabled ? '14px' : '2px',
            width: '10px',
            height: '10px',
            borderRadius: '50%',
            background: enabled ? '#00f0ff' : '#64748b',
            transition: 'left 0.2s, background 0.2s',
          }}
        />
      </span>
      {label}
    </button>
  )
}

const toolbarBtnStyle: React.CSSProperties = {
  width: '36px',
  height: '36px',
  borderRadius: '10px',
  background: 'rgba(8, 8, 24, 0.7)',
  border: '1px solid rgba(0, 240, 255, 0.12)',
  color: '#64748b',
  cursor: 'pointer',
  fontSize: '1rem',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
}

const toolbarSmallBtnStyle: React.CSSProperties = {
  background: 'rgba(0, 240, 255, 0.15)',
  border: '1px solid rgba(0, 240, 255, 0.3)',
  borderRadius: '6px',
  color: '#00f0ff',
  cursor: 'pointer',
  fontSize: '0.6rem',
  padding: '4px 8px',
  fontWeight: 600,
}
