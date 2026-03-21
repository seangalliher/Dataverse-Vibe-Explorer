import { describe, it, expect } from 'vitest'
import { computeLayout, type LayoutNode } from '@/utils/layout'

describe('computeLayout', () => {
  it('returns empty array for empty input', () => {
    expect(computeLayout([])).toEqual([])
  })

  it('positions a single Core node near center', () => {
    const nodes: LayoutNode[] = [{ id: 'account', domain: 'Core', weight: 10 }]
    const results = computeLayout(nodes)
    expect(results).toHaveLength(1)
    expect(results[0].id).toBe('account')
    // Core radius is 0, so position should be small
    const [x, _y, z] = results[0].position
    expect(Math.abs(x)).toBeLessThan(20)
    expect(Math.abs(z)).toBeLessThan(20)
  })

  it('returns correct number of results for multiple nodes', () => {
    const nodes: LayoutNode[] = [
      { id: 'account', domain: 'Core', weight: 10 },
      { id: 'contact', domain: 'Core', weight: 5 },
      { id: 'opportunity', domain: 'Sales', weight: 8 },
      { id: 'incident', domain: 'Service', weight: 3 },
    ]
    const results = computeLayout(nodes)
    expect(results).toHaveLength(4)
  })

  it('groups nodes by domain', () => {
    const nodes: LayoutNode[] = [
      { id: 'a', domain: 'Sales', weight: 1 },
      { id: 'b', domain: 'Sales', weight: 1 },
      { id: 'c', domain: 'Service', weight: 1 },
    ]
    const results = computeLayout(nodes)
    const salesPositions = results.filter((r) => nodes.find((n) => n.id === r.id)?.domain === 'Sales')
    expect(salesPositions).toHaveLength(2)
  })

  it('assigns color sets to each result', () => {
    const nodes: LayoutNode[] = [{ id: 'test', domain: 'Core', weight: 1 }]
    const results = computeLayout(nodes)
    expect(results[0].colors).toBeDefined()
    expect(results[0].colors.primary).toBeTruthy()
    expect(results[0].colors.glow).toBeTruthy()
    expect(results[0].colors.accent).toBeTruthy()
  })

  it('positions all results in 3D space', () => {
    const nodes: LayoutNode[] = Array.from({ length: 10 }, (_, i) => ({
      id: `node-${i}`,
      domain: 'Core' as const,
      weight: i,
    }))
    const results = computeLayout(nodes)
    for (const r of results) {
      expect(r.position).toHaveLength(3)
      expect(typeof r.position[0]).toBe('number')
      expect(typeof r.position[1]).toBe('number')
      expect(typeof r.position[2]).toBe('number')
    }
  })
})
