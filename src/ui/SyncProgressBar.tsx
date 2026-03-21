import { useAppStore } from '@/store/appStore'

export default function SyncProgressBar() {
  const isSyncing = useAppStore((s) => s.isSyncing)
  const syncProgress = useAppStore((s) => s.syncProgress)
  const syncPhase = useAppStore((s) => s.syncPhase)
  const syncLoaded = useAppStore((s) => s.syncLoaded)
  const syncTotal = useAppStore((s) => s.syncTotal)
  const tables = useAppStore((s) => s.tables)

  if (!isSyncing && !syncPhase) return null

  const pct = syncTotal > 0 ? Math.round((syncProgress / syncTotal) * 100) : 0
  const done = !isSyncing && syncPhase.includes('complete')

  return (
    <div style={{
      position: 'fixed',
      bottom: 16,
      left: '50%',
      transform: 'translateX(-50%)',
      zIndex: 50,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: 6,
      pointerEvents: 'none',
    }}>
      {/* Table count badge */}
      <div style={{
        background: 'rgba(0,0,0,0.7)',
        backdropFilter: 'blur(12px)',
        border: '1px solid rgba(0,255,200,0.2)',
        borderRadius: 20,
        padding: '6px 16px',
        fontSize: 12,
        color: done ? '#00ffc8' : '#94a3b8',
        fontFamily: 'monospace',
        letterSpacing: 0.5,
      }}>
        {done
          ? `Sync complete — ${tables.length} tables loaded`
          : `${syncPhase} | ${syncLoaded} of ~${syncTotal} probed | ${tables.length} tables in scene`
        }
      </div>

      {/* Progress bar */}
      {isSyncing && (
        <div style={{
          width: 320,
          height: 3,
          background: 'rgba(255,255,255,0.08)',
          borderRadius: 2,
          overflow: 'hidden',
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
    </div>
  )
}
