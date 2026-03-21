import type { CDMDomain, DomainColorSet } from '@/utils/colors'
import { getDomainColors } from '@/utils/colors'

/** Angular position (radians) for each domain sector */
const DOMAIN_ANGLES: Record<CDMDomain, number> = {
  Core: 0,
  Sales: (Math.PI * 2) / 5,
  Service: (2 * Math.PI * 2) / 5,
  Marketing: (3 * Math.PI * 2) / 5,
  Finance: (4 * Math.PI * 2) / 5,
  Custom: Math.PI, // outer ring handled separately
}

const DOMAIN_RADIUS: Record<CDMDomain, number> = {
  Core: 0,
  Sales: 30,
  Service: 30,
  Marketing: 30,
  Finance: 30,
  Custom: 50,
}

export interface LayoutNode {
  id: string
  domain: CDMDomain
  weight: number // relationship count or record count
}

export interface LayoutResult {
  id: string
  position: [number, number, number]
  colors: DomainColorSet
}

/** Compute positions for a set of table nodes grouped by CDM domain */
export function computeLayout(nodes: LayoutNode[]): LayoutResult[] {
  const grouped = new Map<CDMDomain, LayoutNode[]>()
  for (const node of nodes) {
    const list = grouped.get(node.domain) ?? []
    list.push(node)
    grouped.set(node.domain, list)
  }

  const results: LayoutResult[] = []

  for (const [domain, domainNodes] of grouped) {
    const baseAngle = DOMAIN_ANGLES[domain]
    const baseRadius = DOMAIN_RADIUS[domain]
    const count = domainNodes.length
    const spread = Math.min((Math.PI * 2) / 6, Math.PI / 3)

    domainNodes.forEach((node, i) => {
      let angle: number
      let radius: number

      if (domain === 'Core') {
        // Core tables cluster near center in a small circle
        angle = (i / Math.max(count, 1)) * Math.PI * 2
        radius = 5 + i * 3
      } else {
        // Fan out in the domain sector
        const t = count === 1 ? 0 : (i / (count - 1)) * 2 - 1
        angle = baseAngle + t * spread * 0.5
        radius = baseRadius + (i % 3) * 8
      }

      const x = Math.cos(angle) * radius
      const z = Math.sin(angle) * radius
      const y = 0.5 + Math.random() * 1

      results.push({
        id: node.id,
        position: [x, y, z],
        colors: getDomainColors(domain),
      })
    })
  }

  return results
}
