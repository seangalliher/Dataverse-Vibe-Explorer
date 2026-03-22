import { useEffect, useState } from 'react'
import { useAppStore } from '@/store/appStore'
import { getDomainColors } from '@/utils/colors'
import { formatRecordCount } from '@/data/dataverse'

export function HoverTooltip() {
  const hoveredTableId = useAppStore((s) => s.hoveredTableId)
  const tables = useAppStore((s) => s.tables)
  const [mouse, setMouse] = useState({ x: 0, y: 0 })

  useEffect(() => {
    const onMove = (e: MouseEvent) => setMouse({ x: e.clientX, y: e.clientY })
    window.addEventListener('mousemove', onMove)
    return () => window.removeEventListener('mousemove', onMove)
  }, [])

  if (!hoveredTableId) return null

  const table = tables.find((t) => t.id === hoveredTableId)
  if (!table) return null

  const colors = getDomainColors(table.domain)

  return (
    <div
      style={{
        position: 'fixed',
        left: mouse.x + 14,
        top: mouse.y - 10,
        zIndex: 100,
        pointerEvents: 'none',
        background: 'rgba(5,5,16,0.92)',
        backdropFilter: 'blur(8px)',
        border: `1px solid ${colors.primary}`,
        borderRadius: 6,
        padding: '6px 10px',
        fontFamily: 'monospace',
        fontSize: 12,
        color: '#e2e8f0',
        maxWidth: 260,
        whiteSpace: 'nowrap',
      }}
    >
      <div style={{ color: colors.accent, fontWeight: 600, marginBottom: 2 }}>
        {table.displayName}
      </div>
      <div style={{ color: '#94a3b8', fontSize: 10 }}>
        {table.domain} &middot; {formatRecordCount(table.recordCount)} records
      </div>
    </div>
  )
}
