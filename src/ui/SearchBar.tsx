import { useState, useEffect, useRef, useCallback } from 'react'
import { useAppStore } from '@/store/appStore'
import { getDomainColors } from '@/utils/colors'

export function SearchBar() {
  const { searchOpen, setSearchOpen, tables, apps, setFlyToTarget, setSelectedTable } = useAppStore()
  const [query, setQuery] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  // Ctrl+K to toggle
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setSearchOpen(!searchOpen)
      }
      if (e.key === 'Escape' && searchOpen) {
        setSearchOpen(false)
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [searchOpen, setSearchOpen])

  useEffect(() => {
    if (searchOpen) {
      setQuery('')
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [searchOpen])

  const results = useCallback(() => {
    if (!query.trim()) return []
    const q = query.toLowerCase()

    const tableResults = tables
      .filter((t) => t.displayName.toLowerCase().includes(q) || t.name.toLowerCase().includes(q))
      .slice(0, 6)
      .map((t) => ({
        id: t.id,
        label: t.displayName,
        sublabel: t.name,
        type: 'table' as const,
        domain: t.domain,
        position: t.position,
      }))

    const columnResults = tables
      .flatMap((t) =>
        t.columns
          .filter(
            (c) => c.displayName.toLowerCase().includes(q) || c.name.toLowerCase().includes(q),
          )
          .map((c) => ({
            id: `${t.id}.${c.name}`,
            label: c.displayName,
            sublabel: `${t.displayName} → ${c.dataType}`,
            type: 'column' as const,
            domain: t.domain,
            position: t.position,
          })),
      )
      .slice(0, 4)

    const appResults = apps
      .filter((a) => a.displayName.toLowerCase().includes(q) || a.name.toLowerCase().includes(q))
      .slice(0, 3)
      .map((a) => ({
        id: a.id,
        label: a.displayName,
        sublabel: a.appType,
        type: 'app' as const,
        domain: 'Core' as const,
        position: [0, 5, 0] as [number, number, number],
      }))

    return [...tableResults, ...columnResults, ...appResults]
  }, [query, tables, apps])()

  const handleSelect = (result: (typeof results)[0]) => {
    const pos = result.position
    setFlyToTarget({
      position: [pos[0], pos[1] + 8, pos[2] + 15],
      lookAt: pos,
    })
    if (result.type === 'table') {
      setSelectedTable(result.id)
    }
    setSearchOpen(false)
  }

  if (!searchOpen) return null

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        display: 'flex',
        justifyContent: 'center',
        paddingTop: '15vh',
      }}
      onClick={() => setSearchOpen(false)}
    >
      <div
        style={{
          width: '480px',
          maxHeight: '400px',
          background: 'rgba(8, 8, 24, 0.95)',
          backdropFilter: 'blur(24px)',
          border: '1px solid rgba(0, 240, 255, 0.2)',
          borderRadius: '16px',
          overflow: 'hidden',
          boxShadow: '0 0 60px rgba(0, 240, 255, 0.1), 0 24px 48px rgba(0, 0, 0, 0.4)',
          animation: 'searchIn 0.2s ease-out',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            padding: '14px 18px',
            borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
            gap: '10px',
          }}
        >
          <span style={{ color: '#64748b', fontSize: '1.1rem' }}>&#x1F50D;</span>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search tables, columns, apps..."
            style={{
              flex: 1,
              background: 'transparent',
              border: 'none',
              outline: 'none',
              color: '#e2e8f0',
              fontSize: '0.95rem',
              fontFamily: 'inherit',
            }}
          />
          <kbd
            style={{
              padding: '2px 8px',
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '4px',
              fontSize: '0.65rem',
              color: '#64748b',
            }}
          >
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div style={{ maxHeight: '320px', overflowY: 'auto', padding: '6px' }}>
          {results.length === 0 && query.trim() && (
            <div
              style={{
                padding: '24px',
                textAlign: 'center',
                color: '#475569',
                fontSize: '0.85rem',
              }}
            >
              No results for "{query}"
            </div>
          )}
          {results.map((r) => {
            const domainColor = getDomainColors(r.domain)
            return (
              <button
                key={r.id}
                onClick={() => handleSelect(r)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  width: '100%',
                  padding: '10px 14px',
                  background: 'transparent',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  color: '#e2e8f0',
                  textAlign: 'left',
                  transition: 'background 0.15s',
                }}
                onMouseOver={(e) => {
                  ;(e.currentTarget as HTMLElement).style.background = 'rgba(0, 240, 255, 0.06)'
                }}
                onMouseOut={(e) => {
                  ;(e.currentTarget as HTMLElement).style.background = 'transparent'
                }}
              >
                {/* Domain color dot */}
                <span
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    background: domainColor.primary,
                    boxShadow: `0 0 8px ${domainColor.glow}`,
                    flexShrink: 0,
                  }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.85rem', fontWeight: 500 }}>{r.label}</div>
                  <div style={{ fontSize: '0.7rem', color: '#64748b' }}>{r.sublabel}</div>
                </div>
                <span
                  style={{
                    fontSize: '0.6rem',
                    color: '#475569',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    background: 'rgba(255,255,255,0.04)',
                    padding: '2px 8px',
                    borderRadius: '4px',
                  }}
                >
                  {r.type}
                </span>
              </button>
            )
          })}
        </div>
      </div>

      <style>{`
        @keyframes searchIn {
          from { opacity: 0; transform: translateY(-10px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  )
}
