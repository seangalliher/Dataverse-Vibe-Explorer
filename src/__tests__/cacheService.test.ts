import { describe, it, expect, beforeEach, vi as vitest } from 'vitest'
import { loadCachedTables, saveCachedTables, loadUserPreferences, saveUserPreferences, loadOrgUrl, saveOrgUrl, updateCachedRecordCounts } from '@/data/cacheService'
import { configureDataverse } from '@/data/dataverse'
import { Dve_tablecachesService } from '@/generated/services/Dve_tablecachesService'
import { Dve_userpreferencesService } from '@/generated/services/Dve_userpreferencesService'

// These services are mocked in setup.ts

describe('loadCachedTables', () => {
  beforeEach(() => {
    vitest.mocked(Dve_tablecachesService.getAll).mockReset()
    configureDataverse({ useMock: true, orgUrl: '', environmentId: '' })
  })

  it('returns empty array in mock mode', async () => {
    const result = await loadCachedTables()
    expect(result).toEqual([])
    expect(Dve_tablecachesService.getAll).not.toHaveBeenCalled()
  })

  it('calls service when not in mock mode', async () => {
    configureDataverse({ useMock: false })
    vitest.mocked(Dve_tablecachesService.getAll).mockResolvedValue({ data: [] })
    const result = await loadCachedTables()
    expect(result).toEqual([])
    expect(Dve_tablecachesService.getAll).toHaveBeenCalled()
  })

  it('maps cache rows to TableMetadata format', async () => {
    configureDataverse({ useMock: false })
    vitest.mocked(Dve_tablecachesService.getAll).mockResolvedValue({
      data: [{
        dve_tablecacheid: 'id-1',
        dve_name: 'Account',
        dve_logicalname: 'account',
        dve_entitysetname: 'accounts',
        dve_primaryidattribute: 'accountid',
        dve_primarynameattribute: 'name',
        dve_recordcount: '2450',
        dve_domain: 'Core',
        dve_iscustom: 0,
        dve_schemaname: 'Account',
        dve_columnsjson: JSON.stringify([{ logicalName: 'name', displayName: 'Name', attributeType: 'string' }]),
        dve_lastsyncdate: '2026-03-21T00:00:00Z',
      }],
    })

    const result = await loadCachedTables()
    expect(result).toHaveLength(1)
    expect(result[0].logicalName).toBe('account')
    expect(result[0].displayName).toBe('Account')
    expect(result[0].recordCount).toBe(2450)
    expect(result[0].columns).toHaveLength(1)
  })

  it('handles invalid column JSON gracefully', async () => {
    configureDataverse({ useMock: false })
    vitest.mocked(Dve_tablecachesService.getAll).mockResolvedValue({
      data: [{
        dve_tablecacheid: 'id-1',
        dve_name: 'Account',
        dve_logicalname: 'account',
        dve_entitysetname: 'accounts',
        dve_primaryidattribute: 'accountid',
        dve_primarynameattribute: 'name',
        dve_recordcount: '100',
        dve_domain: 'Core',
        dve_iscustom: 0,
        dve_schemaname: 'Account',
        dve_columnsjson: 'invalid json{{{',
        dve_lastsyncdate: null,
      }],
    })

    const result = await loadCachedTables()
    expect(result[0].columns).toEqual([])
  })

  it('handles service errors gracefully', async () => {
    configureDataverse({ useMock: false })
    vitest.mocked(Dve_tablecachesService.getAll).mockRejectedValue(new Error('Network error'))
    const result = await loadCachedTables()
    expect(result).toEqual([])
  })
})

describe('saveCachedTables', () => {
  beforeEach(() => {
    vitest.mocked(Dve_tablecachesService.getAll).mockReset()
    vitest.mocked(Dve_tablecachesService.create).mockReset()
    vitest.mocked(Dve_tablecachesService.update).mockReset()
    configureDataverse({ useMock: true, orgUrl: '', environmentId: '' })
  })

  it('does nothing in mock mode', async () => {
    await saveCachedTables([])
    expect(Dve_tablecachesService.getAll).not.toHaveBeenCalled()
  })

  it('does nothing for empty array', async () => {
    configureDataverse({ useMock: false })
    await saveCachedTables([])
    expect(Dve_tablecachesService.getAll).not.toHaveBeenCalled()
  })

  it('creates new records for tables not in cache', async () => {
    configureDataverse({ useMock: false })
    vitest.mocked(Dve_tablecachesService.getAll).mockResolvedValue({ data: [] })
    vitest.mocked(Dve_tablecachesService.create).mockResolvedValue({ data: {} })

    await saveCachedTables([{
      logicalName: 'account', displayName: 'Account', description: '',
      entitySetName: 'accounts', primaryIdAttribute: 'accountid',
      primaryNameAttribute: 'name', recordCount: 100, columns: [],
      isCustom: false, schemaName: 'Account',
    }])

    expect(Dve_tablecachesService.create).toHaveBeenCalledTimes(1)
  })

  it('updates existing records', async () => {
    configureDataverse({ useMock: false })
    vitest.mocked(Dve_tablecachesService.getAll).mockResolvedValue({
      data: [{ dve_tablecacheid: 'existing-id', dve_logicalname: 'account' }],
    })
    vitest.mocked(Dve_tablecachesService.update).mockResolvedValue({ data: {} })

    await saveCachedTables([{
      logicalName: 'account', displayName: 'Account', description: '',
      entitySetName: 'accounts', primaryIdAttribute: 'accountid',
      primaryNameAttribute: 'name', recordCount: 200, columns: [],
      isCustom: false, schemaName: 'Account',
    }])

    expect(Dve_tablecachesService.update).toHaveBeenCalledWith('existing-id', expect.any(Object))
  })
})

describe('updateCachedRecordCounts', () => {
  beforeEach(() => {
    vitest.mocked(Dve_tablecachesService.getAll).mockReset()
    vitest.mocked(Dve_tablecachesService.update).mockReset()
    configureDataverse({ useMock: true, orgUrl: '', environmentId: '' })
  })

  it('does nothing in mock mode', async () => {
    await updateCachedRecordCounts(new Map([['account', 500]]))
    expect(Dve_tablecachesService.getAll).not.toHaveBeenCalled()
  })

  it('does nothing for empty counts', async () => {
    configureDataverse({ useMock: false })
    await updateCachedRecordCounts(new Map())
    expect(Dve_tablecachesService.getAll).not.toHaveBeenCalled()
  })

  it('updates matching cache rows', async () => {
    configureDataverse({ useMock: false })
    vitest.mocked(Dve_tablecachesService.getAll).mockResolvedValue({
      data: [
        { dve_tablecacheid: 'id-1', dve_logicalname: 'account' },
        { dve_tablecacheid: 'id-2', dve_logicalname: 'contact' },
      ],
    })
    vitest.mocked(Dve_tablecachesService.update).mockResolvedValue({ data: {} })

    await updateCachedRecordCounts(new Map([['account', 5000]]))
    expect(Dve_tablecachesService.update).toHaveBeenCalledTimes(1)
    expect(Dve_tablecachesService.update).toHaveBeenCalledWith('id-1', expect.objectContaining({
      dve_recordcount: '5000',
    }))
  })
})

describe('loadUserPreferences', () => {
  beforeEach(() => {
    vitest.mocked(Dve_userpreferencesService.getAll).mockReset()
    configureDataverse({ useMock: true, orgUrl: '', environmentId: '' })
  })

  it('returns defaults in mock mode', async () => {
    const prefs = await loadUserPreferences('user@test.com')
    expect(prefs.orgUrl).toBe('')
    expect(prefs.hiddenDomains).toEqual([])
    expect(prefs.highContrast).toBe(false)
  })

  it('returns defaults for empty userId', async () => {
    const prefs = await loadUserPreferences('')
    expect(prefs.hiddenDomains).toEqual([])
  })

  it('maps stored preferences correctly', async () => {
    configureDataverse({ useMock: false })
    vitest.mocked(Dve_userpreferencesService.getAll).mockResolvedValue({
      data: [{
        dve_userpreferenceid: 'pref-1',
        dve_orgurl: 'https://test.crm.dynamics.com',
        dve_hiddendomainsjson: '["Marketing","Custom"]',
        dve_hiddentableidsjson: '["account"]',
        dve_highcontrast: 1,
        dve_reducedmotion: 0,
        dve_preferencesjson: '{"theme":"dark"}',
      }],
    })

    const prefs = await loadUserPreferences('user@test.com')
    expect(prefs.id).toBe('pref-1')
    expect(prefs.orgUrl).toBe('https://test.crm.dynamics.com')
    expect(prefs.hiddenDomains).toEqual(['Marketing', 'Custom'])
    expect(prefs.hiddenTableIds).toEqual(['account'])
    expect(prefs.highContrast).toBe(true)
    expect(prefs.reducedMotion).toBe(false)
    expect(prefs.extra).toEqual({ theme: 'dark' })
  })

  it('handles service errors', async () => {
    configureDataverse({ useMock: false })
    vitest.mocked(Dve_userpreferencesService.getAll).mockRejectedValue(new Error('fail'))
    const prefs = await loadUserPreferences('user@test.com')
    expect(prefs.hiddenDomains).toEqual([])
  })
})

describe('saveUserPreferences', () => {
  beforeEach(() => {
    vitest.mocked(Dve_userpreferencesService.create).mockReset()
    vitest.mocked(Dve_userpreferencesService.update).mockReset()
    configureDataverse({ useMock: true, orgUrl: '', environmentId: '' })
  })

  it('does nothing in mock mode', async () => {
    await saveUserPreferences('user@test.com', 'User', { orgUrl: '', hiddenDomains: [], hiddenTableIds: [], highContrast: false, reducedMotion: false, extra: {} })
    expect(Dve_userpreferencesService.create).not.toHaveBeenCalled()
  })

  it('creates new record when no id', async () => {
    configureDataverse({ useMock: false })
    vitest.mocked(Dve_userpreferencesService.create).mockResolvedValue({ data: { dve_userpreferenceid: 'new-id' } })

    const prefs = { orgUrl: 'https://test.crm.dynamics.com', hiddenDomains: [], hiddenTableIds: [], highContrast: false, reducedMotion: false, extra: {} }
    await saveUserPreferences('user@test.com', 'User', prefs)
    expect(Dve_userpreferencesService.create).toHaveBeenCalledTimes(1)
    expect(prefs.id).toBe('new-id')
  })

  it('updates existing record when id present', async () => {
    configureDataverse({ useMock: false })
    vitest.mocked(Dve_userpreferencesService.update).mockResolvedValue({ data: {} })

    await saveUserPreferences('user@test.com', 'User', {
      id: 'existing-id', orgUrl: '', hiddenDomains: [], hiddenTableIds: [],
      highContrast: true, reducedMotion: false, extra: {},
    })
    expect(Dve_userpreferencesService.update).toHaveBeenCalledWith('existing-id', expect.any(Object))
  })
})

describe('loadOrgUrl', () => {
  beforeEach(() => {
    vitest.mocked(Dve_userpreferencesService.getAll).mockReset()
    configureDataverse({ useMock: true, orgUrl: '', environmentId: '' })
  })

  it('returns empty string in mock mode', async () => {
    expect(await loadOrgUrl()).toBe('')
  })

  it('returns stored org URL', async () => {
    configureDataverse({ useMock: false })
    vitest.mocked(Dve_userpreferencesService.getAll).mockResolvedValue({
      data: [{ dve_userpreferenceid: 'org-1', dve_orgurl: 'https://org.crm.dynamics.com' }],
    })
    expect(await loadOrgUrl()).toBe('https://org.crm.dynamics.com')
  })

  it('returns empty string when no org config exists', async () => {
    configureDataverse({ useMock: false })
    vitest.mocked(Dve_userpreferencesService.getAll).mockResolvedValue({ data: [] })
    expect(await loadOrgUrl()).toBe('')
  })
})

describe('saveOrgUrl', () => {
  beforeEach(() => {
    vitest.mocked(Dve_userpreferencesService.getAll).mockReset()
    vitest.mocked(Dve_userpreferencesService.create).mockReset()
    vitest.mocked(Dve_userpreferencesService.update).mockReset()
    configureDataverse({ useMock: true, orgUrl: '', environmentId: '' })
  })

  it('does nothing in mock mode', async () => {
    await saveOrgUrl('https://test.crm.dynamics.com')
    expect(Dve_userpreferencesService.getAll).not.toHaveBeenCalled()
  })

  it('creates new org config record when none exists', async () => {
    configureDataverse({ useMock: false })
    vitest.mocked(Dve_userpreferencesService.getAll).mockResolvedValue({ data: [] })
    vitest.mocked(Dve_userpreferencesService.create).mockResolvedValue({ data: {} })
    await saveOrgUrl('https://new.crm.dynamics.com')
    expect(Dve_userpreferencesService.create).toHaveBeenCalledTimes(1)
  })

  it('updates existing org config record', async () => {
    configureDataverse({ useMock: false })
    vitest.mocked(Dve_userpreferencesService.getAll).mockResolvedValue({
      data: [{ dve_userpreferenceid: 'org-id' }],
    })
    vitest.mocked(Dve_userpreferencesService.update).mockResolvedValue({ data: {} })
    await saveOrgUrl('https://updated.crm.dynamics.com')
    expect(Dve_userpreferencesService.update).toHaveBeenCalledWith('org-id', expect.objectContaining({
      dve_orgurl: 'https://updated.crm.dynamics.com',
    }))
  })
})
