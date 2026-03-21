import { describe, it, expect } from 'vitest'
import { easeInOutCubic, damp, dampV3 } from '@/utils/easing'
import * as THREE from 'three'

describe('easeInOutCubic', () => {
  it('returns 0 at t=0', () => {
    expect(easeInOutCubic(0)).toBe(0)
  })

  it('returns 1 at t=1', () => {
    expect(easeInOutCubic(1)).toBe(1)
  })

  it('returns 0.5 at t=0.5 (inflection point)', () => {
    expect(easeInOutCubic(0.5)).toBe(0.5)
  })

  it('eases in slowly (first half below linear)', () => {
    expect(easeInOutCubic(0.25)).toBeLessThan(0.25)
  })

  it('eases out slowly (second half above linear)', () => {
    expect(easeInOutCubic(0.75)).toBeGreaterThan(0.75)
  })

  it('is monotonically increasing', () => {
    let prev = -1
    for (let t = 0; t <= 1; t += 0.05) {
      const v = easeInOutCubic(t)
      expect(v).toBeGreaterThanOrEqual(prev)
      prev = v
    }
  })
})

describe('damp', () => {
  it('returns current when dt is 0', () => {
    expect(damp(5, 10, 5, 0)).toBe(5)
  })

  it('moves toward target with positive dt', () => {
    const result = damp(0, 10, 5, 0.016)
    expect(result).toBeGreaterThan(0)
    expect(result).toBeLessThan(10)
  })

  it('converges to target with large dt', () => {
    const result = damp(0, 10, 100, 10)
    expect(result).toBeCloseTo(10, 1)
  })

  it('does not overshoot the target', () => {
    const result = damp(0, 10, 5, 1)
    expect(result).toBeLessThanOrEqual(10)
  })

  it('works with negative targets', () => {
    const result = damp(0, -10, 5, 0.1)
    expect(result).toBeLessThan(0)
  })
})

describe('dampV3', () => {
  it('interpolates each component toward target', () => {
    const current = new THREE.Vector3(0, 0, 0)
    const target = new THREE.Vector3(10, 20, 30)
    dampV3(current, target, 5, 0.1)
    expect(current.x).toBeGreaterThan(0)
    expect(current.y).toBeGreaterThan(0)
    expect(current.z).toBeGreaterThan(0)
    expect(current.x).toBeLessThan(10)
    expect(current.y).toBeLessThan(20)
    expect(current.z).toBeLessThan(30)
  })

  it('mutates the current vector in place', () => {
    const current = new THREE.Vector3(0, 0, 0)
    const target = new THREE.Vector3(5, 5, 5)
    dampV3(current, target, 10, 1)
    expect(current.x).not.toBe(0)
  })
})
