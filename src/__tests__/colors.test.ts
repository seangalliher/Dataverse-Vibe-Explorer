import { describe, it, expect } from 'vitest'
import { CDM_DOMAINS, getDomainColors, BACKGROUND_COLOR, GRID_COLOR, TEXT_COLOR } from '@/utils/colors'

describe('CDM_DOMAINS', () => {
  it('contains exactly 6 domains', () => {
    expect(CDM_DOMAINS).toHaveLength(6)
  })

  it('includes all expected domains', () => {
    expect(CDM_DOMAINS).toContain('Core')
    expect(CDM_DOMAINS).toContain('Sales')
    expect(CDM_DOMAINS).toContain('Service')
    expect(CDM_DOMAINS).toContain('Marketing')
    expect(CDM_DOMAINS).toContain('Finance')
    expect(CDM_DOMAINS).toContain('Custom')
  })
})

describe('getDomainColors', () => {
  it.each([...CDM_DOMAINS])('returns a color set for %s', (domain) => {
    const colors = getDomainColors(domain)
    expect(colors).toBeDefined()
    expect(colors.primary).toMatch(/^#/)
    expect(colors.glow).toMatch(/^#/)
    expect(colors.accent).toMatch(/^#/)
    expect(colors.three).toBeDefined()
    expect(colors.threeGlow).toBeDefined()
  })

  it('Core has cyan-ish primary', () => {
    expect(getDomainColors('Core').primary).toBe('#00f0ff')
  })

  it('Sales has blue primary', () => {
    expect(getDomainColors('Sales').primary).toBe('#3b82f6')
  })

  it('returns consistent results for same domain', () => {
    const a = getDomainColors('Service')
    const b = getDomainColors('Service')
    expect(a.primary).toBe(b.primary)
    expect(a.accent).toBe(b.accent)
  })
})

describe('color constants', () => {
  it('defines dark background', () => {
    expect(BACKGROUND_COLOR).toBe('#050510')
  })

  it('defines grid color', () => {
    expect(GRID_COLOR).toBe('#00f0ff')
  })

  it('defines text color', () => {
    expect(TEXT_COLOR).toBe('#e2e8f0')
  })
})
