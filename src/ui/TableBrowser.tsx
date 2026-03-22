import { useState, useMemo, useCallback } from 'react'
import { useAppStore, filterByApp } from '@/store/appStore'
import { CDM_DOMAINS, getDomainColors } from '@/utils/colors'
import type { CDMDomain } from '@/utils/colors'

/** Map app display names to relevant CDM domains (heuristic when bridge can't resolve tables) */
function getAppDomains(appName: string): CDMDomain[] | null {
  const n = appName.toLowerCase()
  if (n.includes('sales')) return ['Sales', 'Core']
  if (n.includes('customer service') || n.includes('service hub')) return ['Service', 'Core']
  if (n.includes('field service')) return ['Service', 'Core']
  if (n.includes('marketing')) return ['Marketing', 'Core']
  if (n.includes('finance') || n.includes('operations')) return ['Finance', 'Core']
  if (n.includes('project')) return ['Core']
  if (n.includes('portal') || n.includes('power pages')) return ['Core', 'Custom']
  return null // unknown app — don't filter domains
}

export default function TableBrowser() {
  const tables = useAppStore((s) => s.tables)
  const apps = useAppStore((s) => s.apps)
  const isSyncing = useAppStore((s) => s.isSyncing)
  const setFlyToTarget = useAppStore((s) => s.setFlyToTarget)
  const setSelectedTable = useAppStore((s) => s.setSelectedTable)
  const visibleDomains = useAppStore((s) => s.visibleDomains)
  const setVisibleDomains = useAppStore((s) => s.setVisibleDomains)
  const hiddenTableIds = useAppStore((s) => s.hiddenTableIds)
  const toggleTableVisibility = useAppStore((s) => s.toggleTableVisibility)
  const showAllTables = useAppStore((s) => s.showAllTables)
  const activeApp = useAppStore((s) => s.activeAppFilter)
  const setActiveApp = useAppStore((s) => s.setActiveAppFilter)

  // When selecting an app, auto-select relevant domain zones
  const handleAppFilter = useCallback((appId: string | null) => {
    if (!appId) {
      // "All" or toggle-off — clear app filter and restore all domains
      setActiveApp(null)
      setVisibleDomains(new Set(CDM_DOMAINS))
      return
    }
    const app = apps.find((a) => a.id === appId)
    setActiveApp(appId)
    if (app && app.associatedTables.length === 0) {
      // No table-level data — use domain heuristic from app name
      const domains = getAppDomains(app.displayName)
      if (domains) {
        setVisibleDomains(new Set(domains as CDMDomain[]))
      }
    }
  }, [apps, setActiveApp, setVisibleDomains])

  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')

  const toggleDomain = (d: CDMDomain) => {
    const next = new Set(visibleDomains)
    if (next.has(d)) next.delete(d)
    else next.add(d)
    setVisibleDomains(next)
  }

  const selectAllDomains = () => setVisibleDomains(new Set(CDM_DOMAINS))
  const clearAllDomains = () => setVisibleDomains(new Set())

  // Filter the list view (search + app filter)
  const filtered = useMemo(() => {
    let result = filterByApp(tables, apps, activeApp)

    // Filter by search
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(
        (t) =>
          t.displayName.toLowerCase().includes(q) ||
          t.name.toLowerCase().includes(q),
      )
    }

    return result.sort((a, b) => a.displayName.localeCompare(b.displayName))
  }, [tables, activeApp, search, apps])

  const domainCounts = useMemo(() => {
    const counts = new Map<CDMDomain, number>()
    for (const t of tables) {
      counts.set(t.domain, (counts.get(t.domain) ?? 0) + 1)
    }
    return counts
  }, [tables])

  const visibleCount = useMemo(() => {
    let result = tables.filter((t) => visibleDomains.has(t.domain) && !hiddenTableIds.has(t.id))
    result = filterByApp(result, apps, activeApp)
    return result.length
  }, [tables, visibleDomains, hiddenTableIds, activeApp, apps])

  const flyTo = (tableId: string) => {
    const table = tables.find((t) => t.id === tableId)
    if (!table) return
    setSelectedTable(tableId)
    setFlyToTarget({
      position: [table.position[0] + 8, table.position[1] + 6, table.position[2] + 8],
      lookAt: table.position,
    })
  }

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        title="Table Browser"
        style={{
          position: 'fixed',
          top: 16,
          left: 16,
          zIndex: 40,
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(0,255,200,0.25)',
          borderRadius: 8,
          color: '#e2e8f0',
          padding: '8px 14px',
          cursor: 'pointer',
          fontSize: 13,
          fontFamily: 'monospace',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <span style={{ fontSize: 16 }}>&#9776;</span>
        {visibleCount}/{tables.length} Tables
        {isSyncing && (
          <span style={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            background: '#00ffc8',
            animation: 'pulse 1s ease infinite',
          }} />
        )}
      </button>
    )
  }

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      bottom: 0,
      width: 340,
      zIndex: 60,
      background: 'rgba(5,5,16,0.95)',
      backdropFilter: 'blur(16px)',
      borderRight: '1px solid rgba(0,255,200,0.15)',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: 'monospace',
      color: '#e2e8f0',
    }}>
      {/* Header */}
      <div style={{
        padding: '12px 16px',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <span style={{ fontSize: 14, fontWeight: 600 }}>
          Table Browser
          <span style={{ color: '#64748b', marginLeft: 8, fontWeight: 400 }}>
            {visibleCount} visible / {tables.length} total
          </span>
        </span>
        <button
          onClick={() => setOpen(false)}
          style={{
            background: 'none', border: 'none', color: '#64748b',
            cursor: 'pointer', fontSize: 18, padding: '0 4px',
          }}
        >
          &#10005;
        </button>
      </div>

      {/* Search */}
      <div style={{ padding: '8px 16px' }}>
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search tables..."
          style={{
            width: '100%',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: 6,
            color: '#e2e8f0',
            padding: '8px 12px',
            fontSize: 13,
            outline: 'none',
            fontFamily: 'monospace',
          }}
        />
      </div>

      {/* Domain filter chips — these control 3D scene visibility */}
      <div style={{
        padding: '4px 16px 8px',
      }}>
        <div style={{ fontSize: 10, color: '#475569', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 }}>
          Show/Hide Zones (click to toggle in 3D)
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {CDM_DOMAINS.map((d) => {
            const colors = getDomainColors(d)
            const active = visibleDomains.has(d)
            const count = domainCounts.get(d) ?? 0
            return (
              <button
                key={d}
                onClick={() => toggleDomain(d)}
                style={{
                  background: active ? `${colors.primary}22` : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${active ? colors.primary : 'rgba(255,255,255,0.08)'}`,
                  borderRadius: 12,
                  color: active ? colors.primary : '#475569',
                  padding: '3px 10px',
                  fontSize: 11,
                  cursor: 'pointer',
                  fontFamily: 'monospace',
                  transition: 'all 0.15s',
                  textDecoration: active ? 'none' : 'line-through',
                }}
              >
                {d} ({count})
              </button>
            )
          })}
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
          <button onClick={selectAllDomains} style={linkBtnStyle}>Show All</button>
          <button onClick={clearAllDomains} style={linkBtnStyle}>Hide All</button>
          {hiddenTableIds.size > 0 && (
            <button onClick={showAllTables} style={{ ...linkBtnStyle, color: '#00ffc8' }}>
              Reset ({hiddenTableIds.size} hidden)
            </button>
          )}
        </div>
      </div>

      {/* App filter */}
      {apps.length > 0 && (
        <div style={{
          padding: '4px 16px 8px',
          borderTop: '1px solid rgba(255,255,255,0.05)',
        }}>
          <div style={{ fontSize: 10, color: '#475569', marginBottom: 4, textTransform: 'uppercase', letterSpacing: 1 }}>
            Filter by App
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
            <button
              onClick={() => handleAppFilter(null)}
              style={{
                ...chipStyle,
                background: !activeApp ? 'rgba(0,255,200,0.15)' : 'rgba(255,255,255,0.03)',
                borderColor: !activeApp ? '#00ffc8' : 'rgba(255,255,255,0.08)',
                color: !activeApp ? '#00ffc8' : '#475569',
              }}
            >
              All
            </button>
            {apps.map((a) => (
              <button
                key={a.id}
                onClick={() => handleAppFilter(activeApp === a.id ? null : a.id)}
                style={{
                  ...chipStyle,
                  background: activeApp === a.id ? 'rgba(0,170,255,0.15)' : 'rgba(255,255,255,0.03)',
                  borderColor: activeApp === a.id ? '#00aaff' : 'rgba(255,255,255,0.08)',
                  color: activeApp === a.id ? '#00aaff' : '#475569',
                }}
              >
                {a.displayName}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Table list */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        borderTop: '1px solid rgba(255,255,255,0.05)',
      }}>
        {filtered.map((t) => {
          const colors = getDomainColors(t.domain)
          const isHidden = hiddenTableIds.has(t.id) || !visibleDomains.has(t.domain)
          return (
            <div
              key={t.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '6px 16px',
                borderBottom: '1px solid rgba(255,255,255,0.03)',
                opacity: isHidden ? 0.35 : 1,
              }}
            >
              {/* Visibility toggle */}
              <button
                onClick={() => toggleTableVisibility(t.id)}
                title={isHidden ? 'Show in scene' : 'Hide from scene'}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 14,
                  padding: '0 2px',
                  color: isHidden ? '#475569' : colors.primary,
                  flexShrink: 0,
                }}
              >
                {isHidden ? '\u25CB' : '\u25CF'}
              </button>

              {/* Navigate button */}
              <button
                onClick={() => flyTo(t.id)}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  textAlign: 'left',
                  color: '#e2e8f0',
                  fontFamily: 'monospace',
                  fontSize: 12,
                  padding: '2px 0',
                }}
              >
                <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {t.displayName}
                </span>
                <span style={{ color: '#475569', fontSize: 10, flexShrink: 0 }}>
                  {t.domain}
                </span>
              </button>
            </div>
          )
        })}
        {filtered.length === 0 && (
          <div style={{ padding: 24, textAlign: 'center', color: '#475569', fontSize: 12 }}>
            No tables match your filters
          </div>
        )}
      </div>

      {/* Footer */}
      {isSyncing && (
        <div style={{
          padding: '8px 16px',
          borderTop: '1px solid rgba(255,255,255,0.08)',
          fontSize: 11,
          color: '#00ffc8',
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}>
          <span style={{
            width: 6, height: 6, borderRadius: '50%',
            background: '#00ffc8',
            animation: 'pulse 1s ease infinite',
          }} />
          Syncing with Dataverse...
        </div>
      )}
    </div>
  )
}

const linkBtnStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: '#475569',
  cursor: 'pointer',
  fontSize: 10,
  fontFamily: 'monospace',
  textDecoration: 'underline',
  padding: '2px 4px',
}

const chipStyle: React.CSSProperties = {
  border: '1px solid rgba(255,255,255,0.08)',
  borderRadius: 12,
  padding: '3px 10px',
  fontSize: 11,
  cursor: 'pointer',
  fontFamily: 'monospace',
  background: 'rgba(255,255,255,0.03)',
  transition: 'all 0.15s',
}
