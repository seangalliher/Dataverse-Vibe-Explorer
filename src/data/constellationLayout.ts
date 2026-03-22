/**
 * Constellation Layout — force-directed ERD positioning for tables with relationships.
 * Tables without relationships are excluded (they stay at ground level).
 * All constellation positions are elevated to Y=50+ to create the "flying up into the sky" effect.
 */
import type { TableNode, RelationshipEdge } from '@/store/appStore'

const CONSTELLATION_Y = 55       // Base elevation for the ERD
const SPREAD = 12                 // Spacing scale factor
const REPULSION = 800             // Coulomb repulsion constant
const ATTRACTION = 0.06           // Spring attraction constant
const DAMPING = 0.85              // Velocity damping per iteration
const ITERATIONS = 60              // Iterations to converge (keep low — runs on main thread)
const MIN_DISTANCE = 4            // Minimum distance to avoid division by zero

interface LayoutNode {
  id: string
  x: number
  z: number
  vx: number
  vz: number
}

/**
 * Compute constellation (ERD) positions for tables that have relationships.
 * Returns a Map of tableId → [x, y, z] for only the tables that should fly up.
 */
export function computeConstellationLayout(
  tables: TableNode[],
  relationships: RelationshipEdge[],
): Map<string, [number, number, number]> {
  // Find tables that participate in at least one relationship
  const connectedIds = new Set<string>()
  for (const rel of relationships) {
    connectedIds.add(rel.sourceTableId)
    connectedIds.add(rel.targetTableId)
  }

  if (connectedIds.size === 0) return new Map()

  // Build adjacency list for connected tables
  const edges: Array<{ source: string; target: string }> = []
  for (const rel of relationships) {
    if (connectedIds.has(rel.sourceTableId) && connectedIds.has(rel.targetTableId)) {
      edges.push({ source: rel.sourceTableId, target: rel.targetTableId })
    }
  }

  // Initialize nodes in a circle to avoid overlapping start positions
  const connectedTables = tables.filter((t) => connectedIds.has(t.id))
  const nodes: LayoutNode[] = connectedTables.map((t, i) => {
    const angle = (i / connectedTables.length) * Math.PI * 2
    const radius = Math.sqrt(connectedTables.length) * SPREAD * 0.4
    return {
      id: t.id,
      x: Math.cos(angle) * radius,
      z: Math.sin(angle) * radius,
      vx: 0,
      vz: 0,
    }
  })

  const nodeMap = new Map<string, LayoutNode>()
  for (const n of nodes) nodeMap.set(n.id, n)

  // Run force-directed simulation
  for (let iter = 0; iter < ITERATIONS; iter++) {
    // Repulsion between all pairs
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i]
        const b = nodes[j]
        let dx = a.x - b.x
        let dz = a.z - b.z
        let dist = Math.sqrt(dx * dx + dz * dz)
        if (dist < MIN_DISTANCE) dist = MIN_DISTANCE

        const force = REPULSION / (dist * dist)
        const fx = (dx / dist) * force
        const fz = (dz / dist) * force

        a.vx += fx
        a.vz += fz
        b.vx -= fx
        b.vz -= fz
      }
    }

    // Attraction along edges
    for (const edge of edges) {
      const a = nodeMap.get(edge.source)
      const b = nodeMap.get(edge.target)
      if (!a || !b) continue

      const dx = b.x - a.x
      const dz = b.z - a.z
      const dist = Math.sqrt(dx * dx + dz * dz)
      if (dist < 0.01) continue

      const force = ATTRACTION * dist
      const fx = (dx / dist) * force
      const fz = (dz / dist) * force

      a.vx += fx
      a.vz += fz
      b.vx -= fx
      b.vz -= fz
    }

    // Apply velocities and damping
    for (const n of nodes) {
      n.vx *= DAMPING
      n.vz *= DAMPING
      n.x += n.vx
      n.z += n.vz
    }
  }

  // Center the layout around origin
  let cx = 0, cz = 0
  for (const n of nodes) { cx += n.x; cz += n.z }
  cx /= nodes.length
  cz /= nodes.length
  for (const n of nodes) { n.x -= cx; n.z -= cz }

  // Add vertical variation based on connection count (more connected = higher)
  const connectionCount = new Map<string, number>()
  for (const rel of relationships) {
    connectionCount.set(rel.sourceTableId, (connectionCount.get(rel.sourceTableId) ?? 0) + 1)
    connectionCount.set(rel.targetTableId, (connectionCount.get(rel.targetTableId) ?? 0) + 1)
  }
  const maxConnections = Math.max(...[...connectionCount.values()])

  // Build result map
  const result = new Map<string, [number, number, number]>()
  for (const n of nodes) {
    const connections = connectionCount.get(n.id) ?? 1
    const yOffset = (connections / maxConnections) * 15 // Most-connected tables float highest
    result.set(n.id, [n.x, CONSTELLATION_Y + yOffset, n.z])
  }

  return result
}
