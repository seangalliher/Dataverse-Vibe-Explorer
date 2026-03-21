import { useMemo, useState } from 'react'
import { useAppStore } from '@/store/appStore'
import { getDomainColors } from '@/utils/colors'
import { formatRecordCount } from '@/data/dataverse'

export function Minimap() {
  const { tables, minimapOpen, setMinimapOpen, selectedTableId, setFlyToTarget, setSelectedTable } = useAppStore()
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })

  const bounds = useMemo(() => {
    if (tables.length === 0) return { minX: -50, maxX: 50, minZ: -50, maxZ: 50 }
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity
    for (const t of tables) {
      minX = Math.min(minX, t.position[0])
      maxX = Math.max(maxX, t.position[0])
      minZ = Math.min(minZ, t.position[2])
      maxZ = Math.max(maxZ, t.position[2])
    }
    const pad = 15
    return { minX: minX - pad, maxX: maxX + pad, minZ: minZ - pad, maxZ: maxZ + pad }
  }, [tables])

  const mapSize = 180
  const toMapX = (x: number) => ((x - bounds.minX) / (bounds.maxX - bounds.minX)) * mapSize
  const toMapY = (z: number) => ((z - bounds.minZ) / (bounds.maxZ - bounds.minZ)) * mapSize

  const handleDotClick = (e: React.MouseEvent, tableId: string) => {
    e.stopPropagation()
    const table = tables.find((t) => t.id === tableId)
    if (!table) return
    setSelectedTable(table.id)
    setFlyToTarget({
      position: [table.position[0] + 8, table.position[1] + 6, table.position[2] + 8],
      lookAt: table.position,
    })
  }

  const handleDotHover = (e: React.MouseEvent, tableId: string | null) => {
    setHoveredId(tableId)
    if (tableId) {
      setMousePos({ x: e.clientX, y: e.clientY })
    }
  }

  if (!minimapOpen) {
    return (
      <button
        onClick={() => setMinimapOpen(true)}
        style={{
          position: 'fixed',
          bottom: '5rem',
          left: '1rem',
          background: 'rgba(8, 8, 24, 0.7)',
          border: '1px solid rgba(0, 240, 255, 0.15)',
          borderRadius: '8px',
          padding: '6px 10px',
          color: '#64748b',
          cursor: 'pointer',
          fontSize: '0.7rem',
          zIndex: 50,
        }}
      >
        MAP
      </button>
    )
  }

  const hoveredTable = hoveredId ? tables.find((t) => t.id === hoveredId) : null

  return (
    <>
      <div
        style={{
          position: 'fixed',
          bottom: '5rem',
          left: '1rem',
          width: `${mapSize}px`,
          height: `${mapSize}px`,
          background: 'rgba(8, 8, 24, 0.85)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(0, 240, 255, 0.15)',
          borderRadius: '12px',
          zIndex: 50,
          overflow: 'hidden',
        }}
      >
        {/* Close button */}
        <button
          onClick={(e) => {
            e.stopPropagation()
            setMinimapOpen(false)
          }}
          style={{
            position: 'absolute',
            top: '4px',
            right: '6px',
            background: 'none',
            border: 'none',
            color: '#475569',
            cursor: 'pointer',
            fontSize: '0.8rem',
            zIndex: 2,
            lineHeight: 1,
          }}
        >
          &#10005;
        </button>

        {/* Table dots */}
        <svg width={mapSize} height={mapSize} style={{ position: 'absolute', inset: 0 }}>
          {/* Grid lines */}
          <line
            x1={mapSize / 2} y1={0} x2={mapSize / 2} y2={mapSize}
            stroke="rgba(0, 240, 255, 0.06)" strokeWidth="0.5"
          />
          <line
            x1={0} y1={mapSize / 2} x2={mapSize} y2={mapSize / 2}
            stroke="rgba(0, 240, 255, 0.06)" strokeWidth="0.5"
          />

          {/* Table dots */}
          {tables.map((t) => {
            const cx = toMapX(t.position[0])
            const cy = toMapY(t.position[2])
            const colors = getDomainColors(t.domain)
            const isSelected = selectedTableId === t.id
            const isHovered = hoveredId === t.id
            const radius = isSelected ? 5 : isHovered ? 4 : 3

            return (
              <g
                key={t.id}
                style={{ cursor: 'pointer' }}
                onClick={(e) => handleDotClick(e, t.id)}
                onMouseEnter={(e) => handleDotHover(e, t.id)}
                onMouseMove={(e) => setMousePos({ x: e.clientX, y: e.clientY })}
                onMouseLeave={() => setHoveredId(null)}
              >
                {/* Hit area (larger invisible circle for easier clicking) */}
                <circle cx={cx} cy={cy} r={8} fill="transparent" />
                {/* Glow */}
                <circle cx={cx} cy={cy} r={radius + 3} fill={colors.glow} />
                {/* Dot */}
                <circle
                  cx={cx}
                  cy={cy}
                  r={radius}
                  fill={colors.primary}
                  stroke={isSelected ? '#ffffff' : isHovered ? colors.accent : 'none'}
                  strokeWidth={isSelected ? 1.5 : isHovered ? 1 : 0}
                />
              </g>
            )
          })}
        </svg>

        {/* Label */}
        <div
          style={{
            position: 'absolute',
            bottom: '4px',
            left: '8px',
            fontSize: '0.55rem',
            color: '#475569',
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
          }}
        >
          Dataverse Map
        </div>
      </div>

      {/* Tooltip */}
      {hoveredTable && (
        <div
          style={{
            position: 'fixed',
            left: mousePos.x + 12,
            top: mousePos.y - 8,
            zIndex: 100,
            pointerEvents: 'none',
            background: 'rgba(5,5,16,0.92)',
            backdropFilter: 'blur(8px)',
            border: `1px solid ${getDomainColors(hoveredTable.domain).primary}`,
            borderRadius: 6,
            padding: '5px 9px',
            fontFamily: 'monospace',
            fontSize: 11,
            color: '#e2e8f0',
            whiteSpace: 'nowrap',
          }}
        >
          <div style={{ color: getDomainColors(hoveredTable.domain).accent, fontWeight: 600 }}>
            {hoveredTable.displayName}
          </div>
          <div style={{ color: '#94a3b8', fontSize: 9 }}>
            {hoveredTable.domain} &middot; {formatRecordCount(hoveredTable.recordCount)} records
          </div>
        </div>
      )}
    </>
  )
}
