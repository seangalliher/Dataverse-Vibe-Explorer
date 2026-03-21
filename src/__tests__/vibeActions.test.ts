import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useAppStore } from '@/store/appStore'

describe('vibeActions', () => {
  describe('createAppVibe', () => {
    beforeEach(() => {
      vi.useFakeTimers()
      useAppStore.setState({
        tables: [
          { id: 'account', name: 'account', displayName: 'Account', domain: 'Core' as const, recordCount: 100, position: [0, 0, 0] as [number, number, number], columns: [], relationships: [] },
          { id: 'contact', name: 'contact', displayName: 'Contact', domain: 'Core' as const, recordCount: 200, position: [6, 0, 0] as [number, number, number], columns: [], relationships: [] },
        ],
        apps: [],
      })
    })

    afterEach(() => {
      vi.useRealTimers()
    })

    it('creates an app and adds to store', async () => {
      const { createAppVibe } = await import('@/agent/vibeActions')
      const phases: string[] = []

      const promise = createAppVibe('an app for accounts', (state) => {
        phases.push(state.phase)
      })

      // Advance timers to resolve all sleeps
      await vi.runAllTimersAsync()
      const app = await promise

      expect(app.displayName).toBeTruthy()
      expect(app.appType).toBe('canvas')
      expect(useAppStore.getState().apps.length).toBeGreaterThan(0)
    })

    it('progresses through all phases', async () => {
      const { createAppVibe } = await import('@/agent/vibeActions')
      const phases: string[] = []

      const promise = createAppVibe('a dashboard', (state) => {
        if (!phases.includes(state.phase)) phases.push(state.phase)
      })

      await vi.runAllTimersAsync()
      await promise

      expect(phases).toContain('blueprint')
      expect(phases).toContain('constructing')
      expect(phases).toContain('materializing')
      expect(phases).toContain('complete')
    })

    it('associates tables mentioned in description', async () => {
      const { createAppVibe } = await import('@/agent/vibeActions')

      const promise = createAppVibe('manage Account records', () => {})
      await vi.runAllTimersAsync()
      const app = await promise

      expect(app.associatedTables).toContain('account')
    })
  })
})
