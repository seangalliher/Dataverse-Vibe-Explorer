import { useAppStore } from '@/store/appStore'
import { formatRecordCount } from '@/data/dataverse'

export function HudOverlay() {
  const { selectedTableId, tables, loaded, setSelectedTable } = useAppStore()
  const selectedTable = tables.find((t) => t.id === selectedTableId)

  if (!loaded) return null

  return (
    <>
      {/* Controls hint — bottom center */}
      <div
        style={{
          position: 'fixed',
          bottom: '2rem',
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          gap: '1.5rem',
          fontSize: '0.7rem',
          letterSpacing: '0.12em',
          color: 'rgba(0, 200, 255, 0.6)',
          textTransform: 'uppercase',
          pointerEvents: 'none',
          transition: 'opacity 0.5s',
          opacity: selectedTable ? 0.3 : 0.85,
          textShadow: '0 0 8px rgba(0, 200, 255, 0.3), 0 0 20px rgba(0, 200, 255, 0.1)',
        }}
      >
        <span>
          <kbd style={kbdStyle}>WASD</kbd> Move
        </span>
        <span>
          <kbd style={kbdStyle}>Mouse</kbd> Look
        </span>
        <span>
          <kbd style={kbdStyle}>Shift</kbd> Boost
        </span>
        <span>
          <kbd style={kbdStyle}>Space</kbd> Up
        </span>
        <span>
          <kbd style={kbdStyle}>Click</kbd> Select
        </span>
      </div>

      {/* Data inspection HUD panel */}
      {selectedTable && (
        <div
          style={{
            position: 'fixed',
            top: '2rem',
            right: '2rem',
            width: '340px',
            background: 'rgba(10, 10, 30, 0.85)',
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(0, 240, 255, 0.15)',
            borderRadius: '12px',
            padding: '1.5rem',
            color: '#e2e8f0',
            animation: 'hudSlideIn 0.4s ease-out',
            boxShadow: '0 0 40px rgba(0, 240, 255, 0.1), inset 0 0 40px rgba(0, 240, 255, 0.03)',
          }}
        >
          {/* Close button */}
          <button
            onClick={() => setSelectedTable(null)}
            style={{
              position: 'absolute',
              top: '0.75rem',
              right: '0.75rem',
              background: 'none',
              border: 'none',
              color: '#64748b',
              cursor: 'pointer',
              fontSize: '1.2rem',
              lineHeight: 1,
              padding: '4px',
            }}
          >
            ✕
          </button>

          {/* Table name */}
          <h2
            style={{
              fontSize: '1.1rem',
              fontWeight: 600,
              color: '#00f0ff',
              marginBottom: '0.25rem',
              textShadow: '0 0 20px rgba(0, 240, 255, 0.4)',
            }}
          >
            {selectedTable.displayName}
          </h2>

          <p
            style={{
              fontSize: '0.7rem',
              color: '#64748b',
              marginBottom: '1rem',
              fontFamily: 'monospace',
            }}
          >
            {selectedTable.name}
          </p>

          {/* Stats row */}
          <div
            style={{
              display: 'flex',
              gap: '1rem',
              marginBottom: '1.25rem',
              paddingBottom: '1rem',
              borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
            }}
          >
            <Stat label="Records" value={formatRecordCount(selectedTable.recordCount)} />
            <Stat label="Columns" value={String(selectedTable.columns.length)} />
            <Stat label="Domain" value={selectedTable.domain} />
          </div>

          {/* Columns list */}
          <h3
            style={{
              fontSize: '0.65rem',
              textTransform: 'uppercase',
              letterSpacing: '0.1em',
              color: '#64748b',
              marginBottom: '0.5rem',
            }}
          >
            Columns
          </h3>
          <div style={{ maxHeight: '260px', overflowY: 'auto' }}>
            {selectedTable.columns.map((col) => (
              <div
                key={col.name}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '0.35rem 0',
                  borderBottom: '1px solid rgba(255, 255, 255, 0.03)',
                  fontSize: '0.8rem',
                }}
              >
                <span style={{ color: '#cbd5e1' }}>{col.displayName}</span>
                <span
                  style={{
                    fontSize: '0.65rem',
                    color: getDataTypeColor(col.dataType),
                    fontFamily: 'monospace',
                    background: 'rgba(255,255,255,0.05)',
                    padding: '1px 6px',
                    borderRadius: '4px',
                  }}
                >
                  {col.dataType}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <style>{`
        @keyframes hudSlideIn {
          from { opacity: 0; transform: translateX(20px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </>
  )
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: '1rem', fontWeight: 600, color: '#e2e8f0' }}>{value}</div>
      <div
        style={{
          fontSize: '0.6rem',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          color: '#64748b',
          marginTop: '2px',
        }}
      >
        {label}
      </div>
    </div>
  )
}

function getDataTypeColor(dataType: string): string {
  const map: Record<string, string> = {
    string: '#60a5fa',
    number: '#f59e0b',
    boolean: '#10b981',
    datetime: '#a855f7',
    lookup: '#ec4899',
    currency: '#f59e0b',
    memo: '#6366f1',
  }
  return map[dataType.toLowerCase()] ?? '#94a3b8'
}

const kbdStyle: React.CSSProperties = {
  display: 'inline-block',
  padding: '2px 6px',
  border: '1px solid rgba(0, 200, 255, 0.25)',
  borderRadius: '4px',
  fontSize: '0.65rem',
  background: 'rgba(0, 200, 255, 0.06)',
  marginRight: '4px',
  boxShadow: '0 0 6px rgba(0, 200, 255, 0.15)',
}
