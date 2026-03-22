import { useAppStore } from '@/store/appStore'

export default function SyncProgressBar() {
  const isSyncing = useAppStore((s) => s.isSyncing)
  const syncPhase = useAppStore((s) => s.syncPhase)
  const syncLoaded = useAppStore((s) => s.syncLoaded)
  const syncTotal = useAppStore((s) => s.syncTotal)
  const tables = useAppStore((s) => s.tables)

  if (!isSyncing && !syncPhase) return null

  const pct = syncTotal > 0 ? Math.round((syncLoaded / syncTotal) * 100) : 0
  const done = !isSyncing && syncPhase.includes('omplete')

  return (
    <>
      {/* ── Center overlay for active sync ── */}
      {isSyncing && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 40,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          pointerEvents: 'none',
          animation: 'syncFadeIn 0.6s ease',
        }}>
          <div style={{
            background: 'rgba(5, 5, 20, 0.75)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(0, 170, 255, 0.2)',
            borderRadius: 16,
            padding: '2rem 3rem',
            textAlign: 'center',
            maxWidth: 420,
            boxShadow: '0 0 60px rgba(0, 100, 255, 0.15), inset 0 0 30px rgba(0, 170, 255, 0.03)',
          }}>
            {/* Spinner */}
            <div style={{
              width: 36,
              height: 36,
              margin: '0 auto 1rem',
              border: '3px solid rgba(0,170,255,0.2)',
              borderTop: '3px solid #00aaff',
              borderRadius: '50%',
              animation: 'syncSpin 0.8s linear infinite',
            }} />

            {/* Phase label */}
            <div style={{
              fontSize: 14,
              color: '#e2e8f0',
              fontFamily: 'monospace',
              marginBottom: 6,
            }}>
              {syncPhase}
            </div>

            {/* Progress bar */}
            {syncTotal > 0 && (
              <div style={{
                width: 280,
                height: 4,
                background: 'rgba(255,255,255,0.08)',
                borderRadius: 2,
                overflow: 'hidden',
                margin: '0.75rem auto',
              }}>
                <div style={{
                  width: `${pct}%`,
                  height: '100%',
                  background: 'linear-gradient(90deg, #00ffc8, #00aaff)',
                  borderRadius: 2,
                  transition: 'width 0.3s ease',
                  boxShadow: '0 0 8px rgba(0,255,200,0.5)',
                }} />
              </div>
            )}

            {/* Table count */}
            <div style={{
              fontSize: 11,
              color: '#64748b',
              fontFamily: 'monospace',
              marginTop: 4,
            }}>
              {tables.length} tables in scene
            </div>

            {/* First-time hint */}
            <div style={{
              fontSize: 11,
              color: '#475569',
              marginTop: 12,
              lineHeight: 1.5,
            }}>
              First-time setup may take a minute.
              <br />
              Subsequent loads will be instant from cache.
            </div>
          </div>
        </div>
      )}

      {/* ── Bottom-left status badge (always visible during/after sync) ── */}
      <div style={{
        position: 'fixed',
        bottom: '3.5rem',
        left: '1rem',
        zIndex: 50,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        gap: 6,
        pointerEvents: 'none',
        transition: 'opacity 3s ease',
        opacity: done ? 0.5 : 1,
      }}>
        <div style={{
          background: 'rgba(0,0,0,0.7)',
          backdropFilter: 'blur(12px)',
          border: `1px solid ${done ? 'rgba(0,255,200,0.3)' : 'rgba(0,170,255,0.25)'}`,
          borderRadius: 20,
          padding: '6px 16px',
          fontSize: 12,
          color: done ? '#00ffc8' : '#94a3b8',
          fontFamily: 'monospace',
          letterSpacing: 0.5,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
        }}>
          {isSyncing && (
            <span style={{
              display: 'inline-block',
              width: 10,
              height: 10,
              border: '2px solid rgba(0,170,255,0.3)',
              borderTop: '2px solid #00aaff',
              borderRadius: '50%',
              animation: 'syncSpin 0.8s linear infinite',
            }} />
          )}
          {done
            ? `${syncPhase} | ${tables.length} tables loaded`
            : `${syncPhase} | ${tables.length} tables in scene`
          }
        </div>
      </div>

      <style>{`
        @keyframes syncSpin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes syncFadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
      `}</style>
    </>
  )
}
