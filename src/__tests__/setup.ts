import '@testing-library/jest-dom/vitest'

// Mock Three.js — used widely across the codebase
vi.mock('three', () => {
  class Color {
    r = 0; g = 0; b = 0
    constructor(c?: string) {
      if (c) { this.r = 0.5; this.g = 0.5; this.b = 0.5 }
    }
    multiplyScalar(_s: number) { return this }
    set(_c: string) { return this }
    clone() { return new Color() }
  }
  class Vector3 {
    x: number; y: number; z: number
    constructor(x = 0, y = 0, z = 0) { this.x = x; this.y = y; this.z = z }
    set(x: number, y: number, z: number) { this.x = x; this.y = y; this.z = z; return this }
    copy(v: Vector3) { this.x = v.x; this.y = v.y; this.z = v.z; return this }
    lerp(v: Vector3, t: number) {
      this.x += (v.x - this.x) * t; this.y += (v.y - this.y) * t; this.z += (v.z - this.z) * t
      return this
    }
    clone() { return new Vector3(this.x, this.y, this.z) }
  }
  class Euler {
    x = 0; y = 0; z = 0; order = 'XYZ'
    constructor(x = 0, y = 0, z = 0, order = 'XYZ') { this.x = x; this.y = y; this.z = z; this.order = order }
    set(x: number, y: number, z: number) { this.x = x; this.y = y; this.z = z; return this }
    copy(e: Euler) { this.x = e.x; this.y = e.y; this.z = e.z; return this }
  }
  class Shape {
    moveTo() { return this }
    lineTo() { return this }
  }
  class ExtrudeGeometry {}
  class MeshStandardMaterial {}
  class MeshBasicMaterial {}
  class Quaternion {
    x = 0; y = 0; z = 0; w = 1
    setFromEuler() { return this }
  }
  return {
    Color,
    Vector3,
    Euler,
    Quaternion,
    Shape,
    ExtrudeGeometry,
    MeshStandardMaterial,
    MeshBasicMaterial,
    MathUtils: {
      lerp: (a: number, b: number, t: number) => a + (b - a) * t,
      clamp: (v: number, min: number, max: number) => Math.max(min, Math.min(max, v)),
    },
    DoubleSide: 2,
    AdditiveBlending: 2,
    FrontSide: 0,
  }
})

// Mock @microsoft/power-apps/app
vi.mock('@microsoft/power-apps/app', () => ({
  getContext: vi.fn().mockResolvedValue(null),
}))

// Mock @microsoft/power-apps/data
vi.mock('@microsoft/power-apps/data', () => ({
  getClient: vi.fn().mockReturnValue(null),
}))

// Mock generated services
vi.mock('@/generated/services/Dve_tablecachesService', () => ({
  Dve_tablecachesService: {
    getAll: vi.fn().mockResolvedValue({ data: [] }),
    create: vi.fn().mockResolvedValue({ data: {} }),
    update: vi.fn().mockResolvedValue({ data: {} }),
    delete: vi.fn().mockResolvedValue({}),
  },
}))

vi.mock('@/generated/services/Dve_userpreferencesService', () => ({
  Dve_userpreferencesService: {
    getAll: vi.fn().mockResolvedValue({ data: [] }),
    create: vi.fn().mockResolvedValue({ data: {} }),
    update: vi.fn().mockResolvedValue({ data: {} }),
    delete: vi.fn().mockResolvedValue({}),
  },
}))

// Suppress console.warn/log in tests (reduce noise)
vi.spyOn(console, 'log').mockImplementation(() => {})
vi.spyOn(console, 'warn').mockImplementation(() => {})
