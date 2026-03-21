import { describe, it, expect, beforeEach, vi as vitest } from 'vitest'

// We need to mock dataverse before importing metadata
vi.mock('@/data/dataverse', () => ({
  getConfig: vi.fn().mockReturnValue({ useMock: true, orgUrl: '', environmentId: '' }),
  getDataClient: vi.fn().mockReturnValue(null),
  fetchEntityMetadataViaSDK: vi.fn().mockResolvedValue(null),
  sdkRetrieveMultiple: vi.fn().mockResolvedValue(null),
  fetchRecordCount: vi.fn().mockResolvedValue(0),
  getWebApiStatus: vi.fn().mockReturnValue('untested'),
  getBridgeCountStatus: vi.fn().mockReturnValue('untested'),
}))

import { fetchTableMetadata, fetchRelationshipMetadata, fetchAppMetadata, fetchColumnMetadata, discoverAllTables } from '@/data/metadata'
import type { TableMetadata } from '@/data/metadata'
import { getConfig, getDataClient, fetchEntityMetadataViaSDK, sdkRetrieveMultiple } from '@/data/dataverse'

describe('fetchTableMetadata', () => {
  beforeEach(() => {
    vitest.mocked(getConfig).mockReturnValue({ useMock: true, orgUrl: '', environmentId: '' })
    vitest.mocked(getDataClient).mockReturnValue(null)
  })

  it('returns mock data in mock mode', async () => {
    const tables = await fetchTableMetadata()
    expect(tables.length).toBeGreaterThan(0)
    // Should have well-known tables
    const names = tables.map((t) => t.logicalName)
    expect(names).toContain('account')
    expect(names).toContain('contact')
    expect(names).toContain('opportunity')
    expect(names).toContain('incident')
  })

  it('mock tables have required fields', async () => {
    const tables = await fetchTableMetadata()
    for (const t of tables) {
      expect(t.logicalName).toBeTruthy()
      expect(t.displayName).toBeTruthy()
      expect(t.entitySetName).toBeTruthy()
      expect(typeof t.recordCount).toBe('number')
      expect(Array.isArray(t.columns)).toBe(true)
      expect(typeof t.isCustom).toBe('boolean')
    }
  })

  it('mock tables have columns with correct structure', async () => {
    const tables = await fetchTableMetadata()
    for (const t of tables) {
      for (const col of t.columns) {
        expect(col.logicalName).toBeTruthy()
        expect(col.displayName).toBeTruthy()
        expect(col.attributeType).toBeTruthy()
        expect(typeof col.isRequired).toBe('boolean')
        expect(typeof col.isPrimaryId).toBe('boolean')
        expect(typeof col.isPrimaryName).toBe('boolean')
      }
    }
  })

  it('returns mock data when SDK fails', async () => {
    vitest.mocked(getConfig).mockReturnValue({ useMock: false, orgUrl: '', environmentId: '' })
    vitest.mocked(getDataClient).mockReturnValue({})
    vitest.mocked(fetchEntityMetadataViaSDK).mockRejectedValue(new Error('SDK error'))

    const tables = await fetchTableMetadata()
    expect(tables.length).toBeGreaterThan(0)
  })

  it('returns mock data when SDK returns no results', async () => {
    vitest.mocked(getConfig).mockReturnValue({ useMock: false, orgUrl: '', environmentId: '' })
    vitest.mocked(getDataClient).mockReturnValue({})
    vitest.mocked(fetchEntityMetadataViaSDK).mockResolvedValue(null)

    const tables = await fetchTableMetadata()
    expect(tables.length).toBeGreaterThan(0)
  })
})

describe('fetchRelationshipMetadata', () => {
  beforeEach(() => {
    vitest.mocked(getConfig).mockReturnValue({ useMock: true, orgUrl: '', environmentId: '' })
    vitest.mocked(getDataClient).mockReturnValue(null)
  })

  it('returns mock relationships in mock mode', async () => {
    const rels = await fetchRelationshipMetadata()
    expect(rels.length).toBeGreaterThan(0)
  })

  it('mock relationships have correct structure', async () => {
    const rels = await fetchRelationshipMetadata()
    for (const r of rels) {
      expect(r.schemaName).toBeTruthy()
      expect(r.referencingEntity).toBeTruthy()
      expect(r.referencedEntity).toBeTruthy()
      expect(['one-to-many', 'many-to-many']).toContain(r.type)
    }
  })

  it('mock relationships reference known tables', async () => {
    const tables = await fetchTableMetadata()
    const tableNames = new Set(tables.map((t) => t.logicalName))
    const rels = await fetchRelationshipMetadata()
    for (const r of rels) {
      expect(tableNames.has(r.referencingEntity) || tableNames.has(r.referencedEntity)).toBe(true)
    }
  })
})

describe('fetchAppMetadata', () => {
  beforeEach(() => {
    vitest.mocked(getConfig).mockReturnValue({ useMock: true, orgUrl: '', environmentId: '' })
  })

  it('returns mock apps in mock mode', async () => {
    const apps = await fetchAppMetadata()
    expect(apps.length).toBeGreaterThan(0)
  })

  it('mock apps have correct structure', async () => {
    const apps = await fetchAppMetadata()
    for (const app of apps) {
      expect(app.id).toBeTruthy()
      expect(app.displayName).toBeTruthy()
      expect(['model-driven', 'canvas', 'code']).toContain(app.appType)
      expect(Array.isArray(app.associatedTables)).toBe(true)
    }
  })

  it('includes Sales Hub and Customer Service Hub', async () => {
    const apps = await fetchAppMetadata()
    const names = apps.map((a) => a.displayName)
    expect(names).toContain('Sales Hub')
    expect(names).toContain('Customer Service Hub')
  })

  it('returns mock data when SDK fails', async () => {
    vitest.mocked(getConfig).mockReturnValue({ useMock: false, orgUrl: '', environmentId: '' })
    vitest.mocked(sdkRetrieveMultiple).mockRejectedValue(new Error('fail'))
    const apps = await fetchAppMetadata()
    expect(apps.length).toBeGreaterThan(0)
  })
})

describe('fetchColumnMetadata', () => {
  beforeEach(() => {
    vitest.mocked(getConfig).mockReturnValue({ useMock: true, orgUrl: '', environmentId: '' })
  })

  it('returns columns for known mock table', async () => {
    const cols = await fetchColumnMetadata('account')
    expect(cols.length).toBeGreaterThan(0)
    const names = cols.map((c) => c.logicalName)
    expect(names).toContain('name')
  })

  it('returns empty array for unknown table in mock mode', async () => {
    const cols = await fetchColumnMetadata('nonexistent_table')
    expect(cols).toEqual([])
  })
})

describe('discoverAllTables', () => {
  beforeEach(() => {
    vitest.mocked(getConfig).mockReturnValue({ useMock: false, orgUrl: '', environmentId: '' })
    vitest.mocked(getDataClient).mockReturnValue({})
    vitest.mocked(fetchEntityMetadataViaSDK).mockResolvedValue(null)
  })

  it('skips tables that already exist', async () => {
    const existing = new Set(['systemuser', 'team', 'businessunit', 'role', 'organization',
      'connection', 'connectionrole', 'territory', 'queue', 'queueitem',
      'subject', 'calendar', 'sla', 'slakpiinstance',
      'email', 'phonecall', 'appointment', 'task', 'letter', 'fax',
      'socialactivity', 'recurringappointmentmaster',
      'competitor', 'opportunityclose', 'orderclose', 'invoicedetail',
      'quotedetail', 'salesorderdetail', 'opportunityproduct',
      'discount', 'discounttype',
      'contract', 'contractdetail', 'contracttemplate',
      'knowledgebaserecord', 'feedback',
      'bookableresource', 'bookableresourcebooking', 'bookableresourcecategory',
      'characteristic', 'ratingmodel', 'ratingvalue',
      'campaignactivity', 'campaignresponse', 'bulkoperation',
      'goal', 'metric', 'rollupfield', 'goalrollupquery',
      'workflow', 'processsession', 'processstage',
      'sharepointsite', 'sharepointdocumentlocation',
      'solution', 'publisher', 'sdkmessage', 'sdkmessagefilter',
      'aiplugin', 'aipluginoperation', 'msdyn_aiconfiguration',
      'msdyn_aimodel', 'msdyn_aitemplate',
      'msdyn_project', 'msdyn_projecttask', 'msdyn_resourcerequirement',
      'msdyn_timeentry', 'msdyn_expense', 'msdyn_estimate',
      'msdyn_projectteam', 'msdyn_resourceassignment',
      'msdyn_workorder', 'msdyn_workorderproduct', 'msdyn_workorderservice',
      'msdyn_agreement', 'msdyn_customerasset', 'msdyn_incidenttype',
      'msdynci_customerprofile', 'msdynci_customersegment',
      'msdyn_livechatconfig', 'msdyn_ocliveworkitem', 'msdyn_ocsession',
      'msdyn_purchaseorder', 'msdyn_warehouse', 'msdyn_inventoryadjustment',
    ])

    const batches: TableMetadata[][] = []
    const progressCalls: number[] = []

    await discoverAllTables(
      existing,
      (tables) => batches.push(tables),
      (loaded) => progressCalls.push(loaded),
    )

    // When all are already discovered, no batches should be produced
    expect(batches).toHaveLength(0)
  })

  it('calls onProgress callback', async () => {
    const progressCalls: Array<{ loaded: number; total: number }> = []
    const existing = new Set<string>()

    await discoverAllTables(
      existing,
      () => {},
      (loaded, total) => progressCalls.push({ loaded, total }),
    )

    expect(progressCalls.length).toBeGreaterThan(0)
    // Last call should indicate completion
    const last = progressCalls[progressCalls.length - 1]
    expect(last.loaded).toBe(last.total)
  })
})
