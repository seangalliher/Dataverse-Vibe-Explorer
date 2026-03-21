/**
 * Vibe Actions — handles app creation with 3D materialization effects.
 */
import { useAppStore } from '@/store/appStore'
import type { AppMetadata } from '@/data/metadata'

export type VibePhase = 'idle' | 'blueprint' | 'constructing' | 'materializing' | 'complete'

export interface VibeCreationState {
  phase: VibePhase
  appName: string
  progress: number
  targetPosition: [number, number, number]
}

/**
 * Simulate app creation with progressive phases.
 */
export async function createAppVibe(
  description: string,
  onPhaseChange: (state: VibeCreationState) => void,
): Promise<AppMetadata> {
  const store = useAppStore.getState()
  const tables = store.tables

  // Parse description to determine app characteristics
  const appName = extractAppName(description)
  const associatedTableNames = findAssociatedTables(description, tables.map((t) => t.displayName))

  // Find center position of associated tables for portal placement
  const associatedTables = tables.filter((t) =>
    associatedTableNames.some((n) => t.displayName.toLowerCase().includes(n.toLowerCase())),
  )
  const centerPos: [number, number, number] = associatedTables.length > 0
    ? [
        associatedTables.reduce((sum, t) => sum + t.position[0], 0) / associatedTables.length + 12,
        0,
        associatedTables.reduce((sum, t) => sum + t.position[2], 0) / associatedTables.length,
      ]
    : [Math.random() * 20 - 10, 0, Math.random() * 20 - 10]

  // Phase 1: Blueprint
  onPhaseChange({ phase: 'blueprint', appName, progress: 0, targetPosition: centerPos })
  await sleep(1500)

  // Phase 2: Constructing
  for (let p = 0; p <= 100; p += 10) {
    onPhaseChange({ phase: 'constructing', appName, progress: p, targetPosition: centerPos })
    await sleep(200)
  }

  // Phase 3: Materializing
  onPhaseChange({ phase: 'materializing', appName, progress: 100, targetPosition: centerPos })
  await sleep(1200)

  // Phase 4: Complete
  const newApp: AppMetadata = {
    id: `app-${Date.now()}`,
    name: appName.toLowerCase().replace(/\s+/g, ''),
    displayName: appName,
    description,
    appType: 'canvas',
    url: '#/apps/new-app',
    solutionName: 'Custom',
    associatedTables: associatedTables.map((t) => t.id),
  }

  // Add to store
  const currentApps = store.apps
  store.setApps([...currentApps, newApp])

  onPhaseChange({ phase: 'complete', appName, progress: 100, targetPosition: centerPos })

  return newApp
}

function extractAppName(description: string): string {
  // Try to extract a meaningful name
  const cleaned = description
    .replace(/^(an?\s+)?app\s+(for|to|that)\s+/i, '')
    .replace(/^(manage|track|view|show|display)\s+/i, '')
    .trim()

  // Capitalize first letter of each word
  return cleaned
    .split(' ')
    .slice(0, 3)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ') + ' App'
}

function findAssociatedTables(description: string, tableNames: string[]): string[] {
  const lower = description.toLowerCase()
  return tableNames.filter((name) => lower.includes(name.toLowerCase()))
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
