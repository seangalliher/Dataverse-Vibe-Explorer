import { useEffect, useState } from 'react'
import { useAppStore, type TableNode } from '@/store/appStore'
import { sdkRetrieveMultiple, getConfig } from '@/data/dataverse'

export function RecordPreviewPanel() {
  const recordPreview = useAppStore((s) => s.recordPreview)
  const setRecordPreview = useAppStore((s) => s.setRecordPreview)
  const tables = useAppStore((s) => s.tables)
  const [expanded, setExpanded] = useState(false)

  // Fetch records when preview is requested
  useEffect(() => {
    if (!recordPreview || !recordPreview.loading) return

    const table = tables.find((t) => t.id === recordPreview.tableId)
    if (!table) {
      setRecordPreview(null)
      return
    }

    const fetchRecords = async () => {
      if (getConfig().useMock) {
        setRecordPreview({
          tableId: table.id,
          records: generateMockRecords(table),
          loading: false,
        })
        return
      }

      try {
        // Build $select from primary name + first few metadata columns
        const selectCols = table.columns.slice(0, 5).map((c) => c.name)
        if (table.primaryNameAttribute && !selectCols.includes(table.primaryNameAttribute)) {
          selectCols.unshift(table.primaryNameAttribute)
        }

        const top = expanded ? 20 : 5
        let records: Record<string, unknown>[] = []

        // First try: with $select — use entity set name (bridge expects plural form, not logical name)
        const selectQuery = `?$select=${selectCols.join(',')}&$top=${top}`
        console.log(`[RecordPreview] Fetching ${table.entitySetName}: ${selectQuery}`)
        let result = await sdkRetrieveMultiple(table.entitySetName, selectQuery)

        if (result === null) {
          // Retry without $select — some tables reject specific columns
          console.log(`[RecordPreview] Retrying ${table.entitySetName} without $select`)
          result = await sdkRetrieveMultiple(table.entitySetName, `?$top=${top}`)
        }

        if (result !== null) {
          records = Array.isArray(result) ? result : []
        }

        console.log(`[RecordPreview] Got ${records.length} records`,
          records[0] ? Object.keys(records[0]).join(', ') : '(empty)')

        setRecordPreview({ tableId: table.id, records, loading: false })
      } catch (err) {
        console.warn(`[RecordPreview] Failed for ${table.id}:`, err)
        setRecordPreview({ tableId: table.id, records: [], loading: false })
      }
    }

    fetchRecords()
  }, [recordPreview, tables, setRecordPreview, expanded])

  // Close on Escape
  useEffect(() => {
    if (!recordPreview) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setRecordPreview(null)
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [recordPreview, setRecordPreview])

  if (!recordPreview) return null

  const table = tables.find((t) => t.id === recordPreview.tableId)
  if (!table) return null

  // Build display columns from actual record data (source of truth)
  const displayCols = getDisplayColumns(recordPreview.records, table)

  return (
    <div
      style={{
        position: 'fixed',
        bottom: expanded ? '2rem' : '5rem',
        right: '2rem',
        width: expanded ? 'calc(100vw - 4rem)' : 480,
        maxHeight: expanded ? 'calc(100vh - 4rem)' : 320,
        background: 'rgba(8, 8, 24, 0.95)',
        backdropFilter: 'blur(20px)',
        border: '1px solid rgba(0, 240, 255, 0.2)',
        borderRadius: 12,
        padding: '1rem 1.25rem',
        color: '#e2e8f0',
        fontFamily: 'monospace',
        fontSize: '0.75rem',
        zIndex: 80,
        boxShadow: '0 0 30px rgba(0, 240, 255, 0.08)',
        overflowY: 'auto',
        transition: 'all 0.2s ease-out',
      }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem' }}>
        <span style={{ color: '#00f0ff', fontWeight: 600, fontSize: '0.85rem' }}>
          {table.displayName} — Preview
        </span>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={() => {
              setExpanded(!expanded)
              // Re-fetch with more records when expanding
              if (!expanded) {
                setRecordPreview({ tableId: table.id, records: [], loading: true })
              }
            }}
            style={headerBtnStyle}
            title={expanded ? 'Collapse' : 'Expand'}
          >
            {expanded ? '\u25a1' : '\u25a0'}
          </button>
          <button
            onClick={() => setRecordPreview(null)}
            style={headerBtnStyle}
            title="Close"
          >
            x
          </button>
        </div>
      </div>

      {recordPreview.loading ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
          Loading records...
        </div>
      ) : recordPreview.records.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '2rem', color: '#64748b' }}>
          No records found
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: displayCols.length * 120 }}>
            <thead>
              <tr>
                {displayCols.map((col) => (
                  <th
                    key={col.key}
                    style={{
                      textAlign: 'left',
                      padding: '6px 10px',
                      borderBottom: '1px solid rgba(0, 240, 255, 0.15)',
                      color: '#00f0ff',
                      fontSize: '0.65rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.05em',
                      whiteSpace: 'nowrap',
                      position: 'sticky',
                      top: 0,
                      background: 'rgba(8, 8, 24, 0.98)',
                    }}
                  >
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recordPreview.records.map((record, i) => (
                <tr
                  key={i}
                  style={{ background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)' }}
                >
                  {displayCols.map((col) => (
                    <td
                      key={col.key}
                      style={{
                        padding: '5px 10px',
                        borderBottom: '1px solid rgba(255, 255, 255, 0.03)',
                        maxWidth: expanded ? 250 : 120,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        color: '#cbd5e1',
                      }}
                      title={String(record[col.key] ?? '')}
                    >
                      {formatCellValue(record[col.key], expanded)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div style={{ marginTop: '0.5rem', fontSize: '0.6rem', color: '#475569' }}>
        Showing {recordPreview.records.length} record{recordPreview.records.length !== 1 ? 's' : ''}
      </div>
    </div>
  )
}

const headerBtnStyle: React.CSSProperties = {
  background: 'none',
  border: 'none',
  color: '#64748b',
  cursor: 'pointer',
  fontSize: '1rem',
  lineHeight: 1,
  padding: '2px 4px',
}

/**
 * Derive display columns from actual record data, matching to metadata for friendly names.
 * Always uses record keys as source of truth — never shows empty columns.
 */
function getDisplayColumns(
  records: Record<string, unknown>[],
  table: TableNode,
): Array<{ key: string; label: string }> {
  const firstRecord = records[0]
  if (!firstRecord) {
    // No records yet — use metadata columns as placeholders
    return table.columns.slice(0, 5).map((c) => ({ key: c.name, label: c.displayName }))
  }

  // Get all meaningful keys from the record (skip OData metadata)
  const allKeys = Object.keys(firstRecord).filter(
    (k) => !k.startsWith('@') && !k.startsWith('_'),
  )

  // Build a lookup from metadata logical name → display name
  const metaLookup = new Map<string, string>()
  for (const c of table.columns) {
    metaLookup.set(c.name, c.displayName)
  }

  // Prioritize: primary name first, then metadata-matched columns, then remaining keys
  const cols: Array<{ key: string; label: string }> = []
  const used = new Set<string>()

  // Primary name attribute first
  if (table.primaryNameAttribute && allKeys.includes(table.primaryNameAttribute)) {
    cols.push({
      key: table.primaryNameAttribute,
      label: metaLookup.get(table.primaryNameAttribute) ?? table.primaryNameAttribute,
    })
    used.add(table.primaryNameAttribute)
  }

  // Then metadata-matched columns (in metadata order)
  for (const c of table.columns) {
    if (used.has(c.name) || !allKeys.includes(c.name)) continue
    cols.push({ key: c.name, label: c.displayName })
    used.add(c.name)
    if (cols.length >= 8) break
  }

  // Fill remaining from record keys (skip IDs unless nothing else)
  if (cols.length < 3) {
    for (const k of allKeys) {
      if (used.has(k)) continue
      cols.push({ key: k, label: metaLookup.get(k) ?? k })
      used.add(k)
      if (cols.length >= 5) break
    }
  }

  return cols.length > 0 ? cols : allKeys.slice(0, 5).map((k) => ({ key: k, label: k }))
}

function formatCellValue(value: unknown, expanded = false): string {
  if (value === null || value === undefined) return '--'
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (typeof value === 'number') return value.toLocaleString()
  const str = String(value)
  const maxLen = expanded ? 80 : 40
  if (str.length > maxLen) return str.slice(0, maxLen - 3) + '...'
  return str
}

function generateMockRecords(table: TableNode): Record<string, unknown>[] {
  const records: Record<string, unknown>[] = []
  for (let i = 0; i < 5; i++) {
    const record: Record<string, unknown> = {}
    for (const col of table.columns.slice(0, 5)) {
      switch (col.dataType) {
        case 'string': record[col.name] = `Sample ${col.displayName} ${i + 1}`; break
        case 'number': record[col.name] = Math.floor(Math.random() * 1000); break
        case 'currency': record[col.name] = (Math.random() * 10000).toFixed(2); break
        case 'boolean': record[col.name] = i % 2 === 0; break
        case 'datetime': record[col.name] = new Date(Date.now() - i * 86400000).toLocaleDateString(); break
        case 'lookup': record[col.name] = `ref-${i + 1}`; break
        default: record[col.name] = `val-${i + 1}`
      }
    }
    records.push(record)
  }
  return records
}
