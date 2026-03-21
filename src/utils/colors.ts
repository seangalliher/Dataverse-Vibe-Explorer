import * as THREE from 'three'

export const CDM_DOMAINS = ['Core', 'Sales', 'Service', 'Marketing', 'Finance', 'Custom'] as const
export type CDMDomain = (typeof CDM_DOMAINS)[number]

export interface DomainColorSet {
  primary: string
  glow: string
  accent: string
  three: THREE.Color
  threeGlow: THREE.Color
}

const palette: Record<CDMDomain, DomainColorSet> = {
  Core: {
    primary: '#00f0ff',
    glow: '#00f0ff40',
    accent: '#80ffff',
    three: new THREE.Color('#00f0ff'),
    threeGlow: new THREE.Color('#00f0ff').multiplyScalar(0.25),
  },
  Sales: {
    primary: '#3b82f6',
    glow: '#3b82f640',
    accent: '#93c5fd',
    three: new THREE.Color('#3b82f6'),
    threeGlow: new THREE.Color('#3b82f6').multiplyScalar(0.25),
  },
  Service: {
    primary: '#10b981',
    glow: '#10b98140',
    accent: '#6ee7b7',
    three: new THREE.Color('#10b981'),
    threeGlow: new THREE.Color('#10b981').multiplyScalar(0.25),
  },
  Marketing: {
    primary: '#a855f7',
    glow: '#a855f740',
    accent: '#d8b4fe',
    three: new THREE.Color('#a855f7'),
    threeGlow: new THREE.Color('#a855f7').multiplyScalar(0.25),
  },
  Finance: {
    primary: '#f59e0b',
    glow: '#f59e0b40',
    accent: '#fcd34d',
    three: new THREE.Color('#f59e0b'),
    threeGlow: new THREE.Color('#f59e0b').multiplyScalar(0.25),
  },
  Custom: {
    primary: '#94a3b8',
    glow: '#94a3b840',
    accent: '#cbd5e1',
    three: new THREE.Color('#94a3b8'),
    threeGlow: new THREE.Color('#94a3b8').multiplyScalar(0.25),
  },
}

export function getDomainColors(domain: CDMDomain): DomainColorSet {
  return palette[domain]
}

export const BACKGROUND_COLOR = '#050510'
export const GRID_COLOR = '#00f0ff'
export const TEXT_COLOR = '#e2e8f0'
