import { describe, it, expect, beforeEach, vi as vitest } from 'vitest'
import { formatRecordCount, getConfig, configureDataverse, getWebApiStatus, getBridgeCountStatus, getCurrentUser, getDataClient } from '@/data/dataverse'

// We need to reset module state between tests since dataverse.ts
// uses module-level variables for config, status tracking, etc.
// Import the module fresh for isolated tests where needed.

describe('formatRecordCount', () => {
  it('returns "0" for zero', () => {
    expect(formatRecordCount(0)).toBe('0')
  })

  it('formats numbers with locale separators in mock mode', () => {
    // In mock mode (default), web API and bridge are both untested
    // so it shows "est." prefix
    const result = formatRecordCount(1234)
    // Should either be plain number or "est. 1,234"
    expect(result).toMatch(/1[,.]?234/)
  })
})

describe('getConfig', () => {
  it('returns default config with useMock=true', () => {
    const config = getConfig()
    expect(config.useMock).toBe(true)
    expect(config.environmentId).toBe('')
  })
})

describe('configureDataverse', () => {
  beforeEach(() => {
    configureDataverse({ orgUrl: '', useMock: true, environmentId: '' })
  })

  it('merges partial config', () => {
    configureDataverse({ orgUrl: 'https://test.crm.dynamics.com' })
    expect(getConfig().orgUrl).toBe('https://test.crm.dynamics.com')
    expect(getConfig().useMock).toBe(true) // unchanged
  })

  it('can set useMock to false', () => {
    configureDataverse({ useMock: false })
    expect(getConfig().useMock).toBe(false)
  })

  it('can set environmentId', () => {
    configureDataverse({ environmentId: 'env-123' })
    expect(getConfig().environmentId).toBe('env-123')
  })
})

describe('status functions', () => {
  it('getWebApiStatus returns a valid status', () => {
    const status = getWebApiStatus()
    expect(['untested', 'available', 'blocked']).toContain(status)
  })

  it('getBridgeCountStatus returns a valid status', () => {
    const status = getBridgeCountStatus()
    expect(['untested', 'available', 'failed']).toContain(status)
  })

  it('getCurrentUser returns null initially', () => {
    expect(getCurrentUser()).toBeNull()
  })

  it('getDataClient returns null when not initialized', () => {
    expect(getDataClient()).toBeNull()
  })
})

describe('ESTIMATED_COUNTS fallback', () => {
  // Test the fetchRecordCount function in mock mode
  it('fetchRecordCount returns 0 in mock mode', async () => {
    const { fetchRecordCount } = await import('@/data/dataverse')
    configureDataverse({ useMock: true })
    const count = await fetchRecordCount('account', 'accounts')
    expect(count).toBe(0)
  })
})
