import { useEffect, useState, useCallback, useRef } from 'react'
import { useAppStore, type TableNode } from '@/store/appStore'
import { sdkRetrieveMultiple, getConfig } from '@/data/dataverse'

interface SavedView {
  id: string
  name: string
  columns: string[] // logical names parsed from layoutxml
}

export function RecordPreviewPanel() {
  const recordPreview = useAppStore((s) => s.recordPreview)
  const setRecordPreview = useAppStore((s) => s.setRecordPreview)
  const tables = useAppStore((s) => s.tables)
  const [expanded, setExpanded] = useState(false)
  const [views, setViews] = useState<SavedView[]>([])
  const [selectedViewId, setSelectedViewId] = useState<string | null>(null)
  const [viewsLoading, setViewsLoading] = useState(false)
  const [prevTableId, setPrevTableId] = useState<string | null>(null)
  const [activeViewColumns, setActiveViewColumns] = useState<string[] | null>(null)
  const viewChangeRef = useRef(false)

  const table = tables.find((t) => t.id === recordPreview?.tableId)

  // Fetch system views when table changes
  useEffect(() => {
    if (!recordPreview || !table) return
    if (table.id === prevTableId) return // Already fetched for this table

    setPrevTableId(table.id)
    setViews([])
    setSelectedViewId(null)
    setActiveViewColumns(null)

    if (getConfig().useMock) return // No views in mock mode

    const fetchViews = async () => {
      setViewsLoading(true)
      try {
        // Query public system views for this entity type
        const filter = `returnedtypecode eq '${table.name}' and querytype eq 0`
        const query = `?$select=savedqueryid,name,layoutxml&$filter=${encodeURIComponent(filter)}&$orderby=name asc&$top=25`
        console.log(`[Views] Fetching views for ${table.name}`)
        const result = await sdkRetrieveMultiple('savedqueries', query)

        if (result && Array.isArray(result) && result.length > 0) {
          const parsed: SavedView[] = result
            .map((v: any) => ({
              id: v.savedqueryid,
              name: v.name ?? 'Unnamed View',
              columns: parseLayoutXml(v.layoutxml),
            }))
            .filter((v: SavedView) => v.columns.length > 0)

          console.log(`[Views] Found ${parsed.length} views for ${table.name}`)
          setViews(parsed)
        } else {
          console.log(`[Views] No views found for ${table.name}`)
        }
      } catch (err) {
        console.warn(`[Views] Failed to fetch views for ${table.name}:`, err)
      } finally {
        setViewsLoading(false)
      }
    }

    fetchViews()
  }, [recordPreview?.tableId, table, prevTableId])

  // Fetch records when preview is requested or view changes
  const fetchRecords = useCallback(async (targetTable: TableNode, viewColumns: string[] | null, recordCount: number) => {
    if (getConfig().useMock) {
      setRecordPreview({
        tableId: targetTable.id,
        records: generateMockRecords(targetTable),
        loading: false,
      })
      return
    }

    try {
      let selectCols: string[]

      if (viewColumns && viewColumns.length > 0) {
        selectCols = viewColumns
      } else {
        // Default: primary name + first few metadata columns
        selectCols = targetTable.columns.slice(0, 5).map((c) => c.name)
        if (targetTable.primaryNameAttribute && !selectCols.includes(targetTable.primaryNameAttribute)) {
          selectCols.unshift(targetTable.primaryNameAttribute)
        }
      }

      let records: Record<string, unknown>[] = []

      const selectQuery = `?$select=${selectCols.join(',')}&$top=${recordCount}`
      console.log(`[RecordPreview] Fetching ${targetTable.entitySetName}: ${selectQuery}`)
      let result = await sdkRetrieveMultiple(targetTable.entitySetName, selectQuery)

      if (result === null) {
        // Retry without $select — some tables reject specific columns
        console.log(`[RecordPreview] Retrying ${targetTable.entitySetName} without $select`)
        result = await sdkRetrieveMultiple(targetTable.entitySetName, `?$top=${recordCount}`)
      }

      if (result !== null) {
        records = Array.isArray(result) ? result : []
      }

      console.log(`[RecordPreview] Got ${records.length} records`,
        records[0] ? Object.keys(records[0]).join(', ') : '(empty)')

      setRecordPreview({ tableId: targetTable.id, records, loading: false })
    } catch (err) {
      console.warn(`[RecordPreview] Failed for ${targetTable.id}:`, err)
      setRecordPreview({ tableId: targetTable.id, records: [], loading: false })
    }
  }, [setRecordPreview])

  // Trigger fetch on initial load (when loading flag is set externally)
  useEffect(() => {
    if (!recordPreview || !recordPreview.loading || !table) return
    // Skip if this was triggered by a view change (handled directly in handleViewChange)
    if (viewChangeRef.current) {
      viewChangeRef.current = false
      return
    }
    const top = expanded ? 20 : 5
    const view = views.find((v) => v.id === selectedViewId)
    fetchRecords(table, view?.columns ?? null, top)
  }, [recordPreview, table, expanded, selectedViewId, views, fetchRecords])

  // Handle view change — call fetchRecords directly to avoid stale selectedViewId in useEffect
  const handleViewChange = (viewId: string) => {
    const newId = viewId || null
    setSelectedViewId(newId)
    const viewCols = newId ? views.find((v) => v.id === newId)?.columns ?? null : null
    setActiveViewColumns(viewCols)
    if (!table) return
    const top = expanded ? 20 : 5
    viewChangeRef.current = true
    setRecordPreview({ tableId: table.id, records: [], loading: true })
    fetchRecords(table, viewCols, top)
  }

  // Close on Escape
  useEffect(() => {
    if (!recordPreview) return
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setRecordPreview(null)
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [recordPreview, setRecordPreview])

  // Reset state when panel closes
  useEffect(() => {
    if (!recordPreview) {
      setPrevTableId(null)
      setViews([])
      setSelectedViewId(null)
      setActiveViewColumns(null)
      setExpanded(false)
    }
  }, [recordPreview])

  if (!recordPreview || !table) return null

  // Build display columns — use view columns when a view is selected
  const displayCols = getDisplayColumns(recordPreview.records, table, activeViewColumns)

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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
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

      {/* View selector */}
      {!getConfig().useMock && (
        <div style={{ marginBottom: '0.5rem' }}>
          {viewsLoading ? (
            <span style={{ fontSize: '0.65rem', color: '#64748b' }}>Loading views...</span>
          ) : views.length > 0 ? (
            <select
              value={selectedViewId ?? ''}
              onChange={(e) => handleViewChange(e.target.value)}
              style={{
                width: '100%',
                background: 'rgba(255, 255, 255, 0.06)',
                border: '1px solid rgba(0, 240, 255, 0.15)',
                borderRadius: 6,
                padding: '5px 8px',
                color: '#e2e8f0',
                fontSize: '0.7rem',
                fontFamily: 'inherit',
                outline: 'none',
                cursor: 'pointer',
              }}
            >
              <option value="" style={{ background: '#0c0c1e' }}>Default columns</option>
              {views.map((v) => (
                <option key={v.id} value={v.id} style={{ background: '#0c0c1e' }}>
                  {v.name} ({v.columns.length} cols)
                </option>
              ))}
            </select>
          ) : null}
        </div>
      )}

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
        {selectedViewId && views.find((v) => v.id === selectedViewId)
          ? ` · ${views.find((v) => v.id === selectedViewId)!.name}`
          : ''}
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
 * Parse layoutxml from a saved view to extract column logical names.
 * Layout XML looks like: <grid><row><cell name="fullname" width="200" />...</row></grid>
 */
function parseLayoutXml(layoutxml: string | null | undefined): string[] {
  if (!layoutxml) return []
  const cols: string[] = []
  // Match cell name attributes — regex is sufficient for this simple XML structure
  const cellRegex = /<cell[^>]+name=["']([^"']+)["']/gi
  let match
  while ((match = cellRegex.exec(layoutxml)) !== null) {
    cols.push(match[1])
  }
  return cols
}

/**
 * Derive display columns from view columns (if selected) or actual record data.
 * When view columns are provided, uses them in order with metadata labels.
 */
function getDisplayColumns(
  records: Record<string, unknown>[],
  table: TableNode,
  viewColumns?: string[] | null,
): Array<{ key: string; label: string }> {
  // Build a lookup from metadata logical name → display name
  const metaLookup = new Map<string, string>()
  for (const c of table.columns) {
    metaLookup.set(c.name, c.displayName)
  }

  // When a view is selected, use its columns in order
  if (viewColumns && viewColumns.length > 0) {
    return viewColumns.map((col) => ({
      key: col,
      label: metaLookup.get(col) ?? col,
    }))
  }

  const firstRecord = records[0]
  if (!firstRecord) {
    // No records yet — use metadata columns as placeholders
    return table.columns.slice(0, 5).map((c) => ({ key: c.name, label: c.displayName }))
  }

  // Get all meaningful keys from the record (skip OData metadata)
  const allKeys = Object.keys(firstRecord).filter(
    (k) => !k.startsWith('@') && !k.startsWith('_'),
  )

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
