/**
 * Scene Graph Generator — FSN/FSV-inspired city-block grid layout.
 * Tables are organized in rectangular neighborhoods by CDM domain,
 * laid out on a flat grid with streets between blocks.
 *
 * Uses FIXED block origins so positions are stable as tables stream in.
 */
import type { TableMetadata, RelationshipMetadata } from './metadata'
import type { CDMDomain } from '@/utils/colors'
import { CDM_DOMAINS } from '@/utils/colors'
import { classifyTable } from './cdmClassifier'
import type { TableNode, RelationshipEdge, ColumnInfo } from '@/store/appStore'

export interface SceneGraphResult {
  tables: TableNode[]
  relationships: RelationshipEdge[]
}

// Grid spacing constants
const CELL_SIZE = 6        // Space between table centers in a block
const BLOCK_COLUMNS = 10   // Tables per row within a block (wide blocks = fewer rows)
const STREET_GAP = 16      // Gap (street) between blocks
const MAX_BLOCK_ROWS = 20  // Reserve space for up to 200 tables per domain

// Computed block dimensions
const BLOCK_WIDTH = BLOCK_COLUMNS * CELL_SIZE   // 60 units
const BLOCK_DEPTH = MAX_BLOCK_ROWS * CELL_SIZE  // 72 units

// Column and row pitch (block size + street)
const COL_PITCH = BLOCK_WIDTH + STREET_GAP  // 76
const ROW_PITCH = BLOCK_DEPTH + STREET_GAP  // 88

// Domain block positions — arranged in a 3×2 grid of neighborhoods
const BLOCK_GRID: Record<CDMDomain, { col: number; row: number }> = {
  Core:      { col: 0, row: 0 },
  Sales:     { col: 1, row: 0 },
  Service:   { col: 2, row: 0 },
  Marketing: { col: 0, row: 1 },
  Finance:   { col: 1, row: 1 },
  Custom:    { col: 2, row: 1 },
}

// Total grid dimensions (for centering)
const TOTAL_WIDTH = 3 * COL_PITCH - STREET_GAP
const TOTAL_DEPTH = 2 * ROW_PITCH - STREET_GAP

/**
 * Compute the fixed world-space origin for a domain block.
 * These never change, so positions are stable as tables stream in.
 */
function blockOrigin(domain: CDMDomain): { x: number; z: number } {
  const g = BLOCK_GRID[domain]
  return {
    x: -(TOTAL_WIDTH / 2) + g.col * COL_PITCH,
    z: -(TOTAL_DEPTH / 2) + g.row * ROW_PITCH,
  }
}

/**
 * Position a table within its domain block using grid coordinates.
 */
function gridPosition(
  domain: CDMDomain,
  index: number,
  recordCount: number,
): [number, number, number] {
  const origin = blockOrigin(domain)
  const col = index % BLOCK_COLUMNS
  const row = Math.floor(index / BLOCK_COLUMNS)

  const x = origin.x + col * CELL_SIZE
  const z = origin.z + row * CELL_SIZE

  // Height: subtle variation based on record count (log scale), FSN-style
  const y = 0.2 + Math.log10(Math.max(recordCount, 10)) * 0.4

  return [x, y, z]
}

/**
 * Build the full scene graph from Dataverse metadata.
 */
export function buildSceneGraph(
  tableMeta: TableMetadata[],
  relationshipMeta: RelationshipMetadata[],
): SceneGraphResult {
  // Classify tables into domains
  const classified = tableMeta.map((t) => ({
    ...t,
    domain: classifyTable(t.logicalName, t.isCustom),
  }))

  // Count relationships per table for sorting
  const relCount = new Map<string, number>()
  for (const r of relationshipMeta) {
    relCount.set(r.referencedEntity, (relCount.get(r.referencedEntity) ?? 0) + 1)
    relCount.set(r.referencingEntity, (relCount.get(r.referencingEntity) ?? 0) + 1)
  }

  // Group by domain
  const domainGroups = new Map<CDMDomain, typeof classified>()
  for (const t of classified) {
    const group = domainGroups.get(t.domain) ?? []
    group.push(t)
    domainGroups.set(t.domain, group)
  }

  // Compute positions on the grid
  const tables: TableNode[] = []

  for (const [domain, group] of domainGroups) {
    // Sort by relationship count (most connected first = front of block)
    group.sort((a, b) => (relCount.get(b.logicalName) ?? 0) - (relCount.get(a.logicalName) ?? 0))

    group.forEach((t, i) => {
      const position = gridPosition(domain, i, t.recordCount)

      const columns: ColumnInfo[] = t.columns.map((c) => ({
        name: c.logicalName,
        displayName: c.displayName,
        dataType: c.attributeType,
        isRequired: c.isRequired,
      }))

      const relatedIds = relationshipMeta
        .filter((r) => r.referencedEntity === t.logicalName || r.referencingEntity === t.logicalName)
        .map((r) => (r.referencedEntity === t.logicalName ? r.referencingEntity : r.referencedEntity))

      tables.push({
        id: t.logicalName,
        name: t.logicalName,
        displayName: t.displayName,
        domain,
        recordCount: t.recordCount,
        position,
        columns,
        relationships: relatedIds,
        entitySetName: t.entitySetName,
        primaryNameAttribute: t.primaryNameAttribute,
        primaryIdAttribute: t.primaryIdAttribute,
      })
    })
  }

  // Build relationship edges
  const tableSet = new Set(tables.map((t) => t.id))
  const relationships: RelationshipEdge[] = relationshipMeta
    .filter((r) => tableSet.has(r.referencedEntity) && tableSet.has(r.referencingEntity))
    .map((r, i) => ({
      id: `rel-${i}`,
      sourceTableId: r.referencedEntity,
      targetTableId: r.referencingEntity,
      type: r.type,
    }))

  return { tables, relationships }
}

/**
 * Position a batch of newly discovered tables into the grid.
 * Uses the same fixed block origins, so new tables slot into the
 * correct position without affecting existing ones.
 */
export function positionNewTables(
  newTableMeta: TableMetadata[],
  existingTables: TableNode[],
): TableNode[] {
  // Count how many tables already exist per domain
  const domainCounts = new Map<CDMDomain, number>()
  for (const t of existingTables) {
    domainCounts.set(t.domain, (domainCounts.get(t.domain) ?? 0) + 1)
  }

  const nodes: TableNode[] = []

  for (const t of newTableMeta) {
    const domain = classifyTable(t.logicalName, t.isCustom)
    const existingCount = domainCounts.get(domain) ?? 0
    const idx = existingCount + nodes.filter((n) => n.domain === domain).length

    const position = gridPosition(domain, idx, t.recordCount)

    const columns: ColumnInfo[] = t.columns.map((c) => ({
      name: c.logicalName,
      displayName: c.displayName,
      dataType: c.attributeType,
      isRequired: c.isRequired,
    }))

    nodes.push({
      id: t.logicalName,
      name: t.logicalName,
      displayName: t.displayName,
      domain,
      recordCount: t.recordCount,
      position,
      columns,
      relationships: [],
      entitySetName: t.entitySetName,
      primaryNameAttribute: t.primaryNameAttribute,
      primaryIdAttribute: t.primaryIdAttribute,
    })
  }

  return nodes
}

/**
 * Get the world-space center of a domain block for labels and camera targets.
 */
export function getDomainBlockCenter(domain: CDMDomain, tableCount: number): [number, number, number] {
  const origin = blockOrigin(domain)
  const rows = Math.ceil(Math.max(tableCount, 1) / BLOCK_COLUMNS)
  const cols = Math.min(tableCount, BLOCK_COLUMNS)
  return [
    origin.x + (cols - 1) * CELL_SIZE * 0.5,
    5,
    origin.z + (rows - 1) * CELL_SIZE * 0.5,
  ]
}
