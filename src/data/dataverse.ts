/**
 * Dataverse connector wrapper.
 * When running inside Power Apps Code Apps, uses the @microsoft/power-apps SDK
 * for authenticated Dataverse access via the host bridge.
 * Falls back to mock data in local dev.
 *
 * Bridge capabilities (as of March 2026):
 * - retrieveMultipleRecordsAsync: WORKS (any table, no registration needed)
 * - retrieveRecordAsync: WORKS
 * - createRecordAsync / updateRecordAsync / deleteRecordAsync: WORKS
 * - executeAsync with 'getEntityMetadata': WORKS
 * - count: true option: BREAKS all queries (bridge rejects $count param)
 * - Direct Web API fetch: BLOCKED by CORS from iframe
 * Record counts use estimates since $count is not supported through the bridge.
 */

export interface DataverseConfig {
  orgUrl: string
  useMock: boolean
  environmentId: string
}

let config: DataverseConfig = {
  orgUrl: '',
  useMock: true,
  environmentId: '',
}

// Org URL embedded at build time via VITE_DATAVERSE_ORG_URL (set by deploy script)
const BUILD_TIME_ORG_URL = (import.meta as any).env?.VITE_DATAVERSE_ORG_URL ?? ''

// SDK data client — set during init when running inside Power Apps
let dataClient: any = null

// Current user info from Power Apps context
let currentUser: { id: string; displayName: string } | null = null

// Tracks whether direct Web API calls work (set after first successful fetch)
let webApiStatus: 'untested' | 'available' | 'blocked' = 'untested'

export function getWebApiStatus() {
  return webApiStatus
}

export function getCurrentUser() {
  return currentUser
}

/**
 * Initialize the Dataverse connection.
 * Auto-detects Power Apps host — if running inside a Code App,
 * switches to live mode. Uses dynamic import so a missing SDK can't crash the app.
 */
export async function initializeDataverse(): Promise<void> {
  // Restore org URL: localStorage > build-time embed
  try {
    const savedUrl = localStorage.getItem('dve-orgUrl')
    if (savedUrl) config.orgUrl = savedUrl
  } catch { /* localStorage may not be available */ }
  if (!config.orgUrl && BUILD_TIME_ORG_URL) {
    config.orgUrl = BUILD_TIME_ORG_URL
  }

  try {
    const { getContext } = await import('@microsoft/power-apps/app')

    // The Power Apps bridge handshake can take time on first load.
    const ctx = await Promise.race([
      getContext(),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 15000)),
    ])
    if (ctx?.app?.environmentId) {
      config.useMock = false
      config.environmentId = ctx.app.environmentId
      // Capture user info for preferences
      if (ctx.user?.userPrincipalName) {
        currentUser = {
          id: ctx.user.userPrincipalName,
          displayName: ctx.user.fullName ?? ctx.user.userPrincipalName,
        }
      }
      console.log('[Dataverse] Connected via Power Apps host', {
        env: ctx.app.environmentId,
        user: ctx.user?.userPrincipalName,
      })

      // Initialize SDK data client for bridge-based Dataverse access
      try {
        const { getClient } = await import('@microsoft/power-apps/data')
        const { dataSourcesInfo } = await import('../../.power/schemas/appschemas/dataSourcesInfo')
        dataClient = getClient(dataSourcesInfo)
        console.log('[Dataverse] SDK data client ready (with dataSourcesInfo)', Object.keys(dataSourcesInfo))

        // Diagnostic: test a few tables to identify bridge-level access patterns
        setTimeout(async () => {
          // Test with ENTITY SET names (plural) — this is what the bridge API expects
          const testTables = ['accounts', 'contacts', 'opportunities', 'incidents', 'leads']
          console.log('[Diagnostic] Testing bridge access with entity set names (plural)...')
          for (const entitySetName of testTables) {
            try {
              const r = await dataClient.retrieveMultipleRecordsAsync(entitySetName, `?$top=1`)
              const ok = r?.success !== false
              const count = ok ? (r?.data?.length ?? r?.entities?.length ?? r?.value?.length ?? '?') : 'BLOCKED'
              console.log(`[Diagnostic] ${entitySetName}: ${ok ? 'OK' : 'FAILED'} (${count})`, ok ? '' : JSON.stringify(r).slice(0, 200))
            } catch (err) {
              console.log(`[Diagnostic] ${entitySetName}: EXCEPTION`, err)
            }
          }
        }, 3000) // Delay to avoid blocking init
      } catch (err) {
        console.warn('[Dataverse] SDK data client init failed:', err)
      }

      return
    }
  } catch (err) {
    console.warn('[Dataverse] SDK init failed:', err)
  }

  config.useMock = true
  console.log('[Dataverse] Running in demo mode (mock data)')
}

export function configureDataverse(cfg: Partial<DataverseConfig>) {
  config = { ...config, ...cfg }
}

export function getConfig(): DataverseConfig {
  return config
}

export function getDataClient(): any {
  return dataClient
}

/**
 * Fetch entity metadata using the SDK's executeAsync with dataverseRequest.
 * This routes through the Power Apps bridge for authenticated access.
 */
export async function fetchEntityMetadataViaSDK(tableName: string): Promise<any> {
  if (!dataClient) return null
  try {
    const result = await dataClient.executeAsync({
      dataverseRequest: {
        action: 'getEntityMetadata',
        parameters: {
          tableName,
          options: {
            metadata: [
              'LogicalName', 'DisplayName', 'Description', 'EntitySetName',
              'PrimaryIdAttribute', 'PrimaryNameAttribute', 'SchemaName',
              'IsCustomEntity', 'IsPrivate', 'IsIntersect',
            ],
            schema: {
              columns: 'all',
              oneToMany: true,
              manyToOne: true,
              manyToMany: true,
            },
          },
        },
      },
    })
    const meta = result?.data ?? result
    if (meta) {
      console.log(`[Metadata] ${tableName}: EntitySetName=${meta.EntitySetName}, PrimaryIdAttribute=${meta.PrimaryIdAttribute}`)
      // Log response shape once to understand where EntitySetName lives
      if (meta.EntitySetName === undefined) {
        const keys = Object.keys(meta).slice(0, 15).join(', ')
        console.log(`[Metadata] ${tableName} response keys: [${keys}]`)
      }
    }
    return meta
  } catch (err) {
    console.warn(`[Metadata] SDK metadata fetch for ${tableName} failed:`, err)
    return null
  }
}

/**
 * Fetch multiple records using the SDK.
 * Works for any Dataverse table via the bridge — no pac code add-data-source registration needed.
 * Note: do NOT pass count: true — it causes the bridge to reject the entire query.
 */
export async function sdkRetrieveMultiple(tableName: string, options?: string): Promise<any> {
  if (!dataClient) return null
  try {
    console.log(`[SDK] retrieveMultiple(${tableName}, ${options ?? 'no-options'})`)
    const result = await dataClient.retrieveMultipleRecordsAsync(tableName, options)
    if (result?.success === false) {
      // Dump the full error shape to help diagnose per-table failures
      const errStr = JSON.stringify(result, null, 2)
      console.warn(`[SDK] ${tableName} → success=false. Full response:`, errStr.slice(0, 1000))
      // Retry with no options if we had options
      if (options) {
        console.log(`[SDK] Retrying ${tableName} with no options`)
        const retry = await dataClient.retrieveMultipleRecordsAsync(tableName)
        if (retry?.success === false) {
          console.warn(`[SDK] ${tableName} retry also failed:`, JSON.stringify(retry).slice(0, 500))
          return null
        }
        const retryRecords = retry?.data ?? retry?.entities ?? retry?.value
        if (Array.isArray(retryRecords)) return retryRecords
        if (Array.isArray(retry)) return retry
        return retry
      }
      return null
    }
    // Normalize: bridge may return {data: [...]}, {entities: [...]}, {value: [...]}, or raw array
    const records = result?.data ?? result?.entities ?? result?.value
    if (Array.isArray(records)) {
      console.log(`[SDK] ${tableName} → ${records.length} records`)
      return records
    }
    if (Array.isArray(result)) {
      console.log(`[SDK] ${tableName} → ${result.length} records (raw array)`)
      return result
    }
    console.log(`[SDK] ${tableName} unexpected shape:`, typeof result, result ? Object.keys(result) : 'null')
    return result
  } catch (err) {
    console.warn(`[SDK] ${tableName} exception:`, err)
    return null
  }
}

/**
 * Try to discover all tables via the EntityDefinitions OData metadata endpoint.
 * This probably won't work through the Power Apps bridge (since EntityDefinitions
 * is a metadata endpoint, not a data table), but costs one call to try.
 */
export async function tryEntityDefinitions(): Promise<Array<{
  logicalName: string
  displayName: string
  entitySetName: string
  primaryIdAttribute: string
  primaryNameAttribute: string
  isCustom: boolean
}> | null> {
  if (!dataClient) return null
  try {
    const result = await dataClient.retrieveMultipleRecordsAsync(
      'EntityDefinitions',
      "?$select=LogicalName,DisplayName,EntitySetName,PrimaryIdAttribute,PrimaryNameAttribute,IsCustomEntity&$filter=IsPrivate eq false and IsIntersect eq false&$top=1000",
    )
    if (result?.success === false) {
      console.log('[Discovery] EntityDefinitions not available through bridge')
      return null
    }
    const records = result?.data ?? result?.entities ?? result?.value ?? (Array.isArray(result) ? result : [])
    if (!Array.isArray(records) || records.length === 0) return null
    console.log(`[Discovery] EntityDefinitions returned ${records.length} tables`)
    return records.map((r: any) => ({
      logicalName: r.LogicalName ?? r.logicalname ?? '',
      displayName: r.DisplayName?.UserLocalizedLabel?.Label ?? r.LogicalName ?? r.logicalname ?? '',
      entitySetName: r.EntitySetName ?? r.entitysetname ?? '',
      primaryIdAttribute: r.PrimaryIdAttribute ?? r.primaryidattribute ?? '',
      primaryNameAttribute: r.PrimaryNameAttribute ?? r.primarynameattribute ?? '',
      isCustom: r.IsCustomEntity ?? r.iscustomentity ?? false,
    })).filter((e: any) => e.logicalName && e.entitySetName)
  } catch {
    console.log('[Discovery] EntityDefinitions query failed (expected)')
    return null
  }
}

/**
 * Discover table logical names via the sdkmessagefilter table.
 * This is a standard data table that maps SDK messages to entities.
 * Each row has a primaryobjecttypecode field with the entity logical name.
 */
export async function discoverTableNamesViaSdkMessageFilter(): Promise<string[] | null> {
  if (!dataClient) return null
  try {
    const result = await sdkRetrieveMultiple(
      'sdkmessagefilters',
      '?$select=primaryobjecttypecode&$top=5000',
    )
    if (!result) return null
    const records = Array.isArray(result) ? result : []
    if (records.length === 0) return null

    const names = new Set<string>()
    for (const r of records) {
      const name = r.primaryobjecttypecode
      if (name && typeof name === 'string' && name !== 'none') {
        names.add(name)
      }
    }
    const tableNames = [...names].filter((n) => !shouldExcludeTable(n))
    console.log(`[Discovery] sdkmessagefilter returned ${names.size} unique entities, ${tableNames.length} after filtering`)
    return tableNames
  } catch {
    console.warn('[Discovery] sdkmessagefilter query failed')
    return null
  }
}

/**
 * Tables to exclude from discovery — internal system tables that add noise.
 */
const EXCLUDED_TABLE_PREFIXES = [
  'principalobject', 'audit', 'plugintracelog', 'asyncoperation',
  'bulkdeletefailure', 'importlog', 'subscriptionmanuallytrackedobject',
  'subscriptionsyncinfo', 'subscriptiontrackingdeletedobject',
  'mailboxtrackingfolder', 'duplicaterecord', 'userentityinstancedata',
  'userentityuisettings', 'systemuserbusinessunitentitymap',
]

const EXCLUDED_TABLES = new Set([
  'postfollow', 'postregarding', 'postcomment', 'post',
  'traceregarding', 'tracelog',
  'workflowlog', 'workflowwaitsubscription',
  'fieldsecurityprofile', 'fieldpermission',
  'importdata', 'importentitymapping', 'importfile', 'import',
  'imagedescriptor', 'ribboncommand', 'ribbonrule', 'ribbondiff',
  'savedqueryvisualization', 'userqueryvisualization',
  'statusmap', 'stringmap', 'attributemap', 'entitymap',
])

export function shouldExcludeTable(logicalName: string): boolean {
  if (EXCLUDED_TABLES.has(logicalName)) return true
  return EXCLUDED_TABLE_PREFIXES.some((p) => logicalName.startsWith(p))
}

/**
 * Generic fetch wrapper for Dataverse Web API (standalone mode only).
 */
export async function dataverseFetch<T>(endpoint: string): Promise<T> {
  if (config.useMock) {
    throw new Error('Mock mode: use mock data providers instead of live fetch')
  }

  const base = config.orgUrl || ''
  const url = `${base}/api/data/v9.2/${endpoint}`

  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
      'OData-MaxVersion': '4.0',
      'OData-Version': '4.0',
      Prefer: 'odata.include-annotations="*"',
    },
  })

  if (!response.ok) {
    throw new Error(`Dataverse API error: ${response.status} ${response.statusText}`)
  }

  return response.json() as Promise<T>
}

// Tracks whether bridge-based record counts are available
let bridgeCountStatus: 'untested' | 'available' | 'failed' = 'untested'

// Track which tables have real (bridge/WebAPI) counts vs estimate fallbacks
const verifiedCountTables = new Set<string>()

export function getBridgeCountStatus() {
  return bridgeCountStatus
}

export function isCountVerified(logicalName: string): boolean {
  return verifiedCountTables.has(logicalName)
}

/**
 * Fetch a record count via the SDK bridge by selecting only primary IDs.
 * Uses sdkRetrieveMultiple for consistent response normalization.
 * IMPORTANT: The bridge's retrieveMultipleRecordsAsync expects the entity
 * **set name** (plural, e.g. 'accounts'), NOT the logical name ('account').
 * Returns null if the bridge call fails.
 */
async function fetchCountViaBridge(
  entitySetName: string,
  primaryIdAttribute: string,
): Promise<number | null> {
  if (!dataClient || config.useMock) return null

  try {
    const PAGE_SIZE = 5000

    // Use entity set name (plural) — bridge expects entity set name, not logical name
    const query = `?$select=${primaryIdAttribute}&$top=${PAGE_SIZE}`
    const records = await sdkRetrieveMultiple(entitySetName, query)

    if (!records) {
      console.warn(`[Dataverse] Bridge count returned null for ${entitySetName}`)
      return null
    }

    if (bridgeCountStatus === 'untested') {
      bridgeCountStatus = 'available'
    }

    const total = Array.isArray(records) ? records.length : 0
    console.log(`[Dataverse] Count ${entitySetName}: ${total}`)

    return total
  } catch (err) {
    console.warn(`[Dataverse] Bridge count exception for ${entitySetName}:`, err)
    return null
  }
}

/**
 * Refresh record counts for a list of tables via the SDK bridge.
 * Fetches counts sequentially to avoid overwhelming the bridge.
 */
export async function refreshRecordCountsViaBridge(
  tables: Array<{ logicalName: string; entitySetName: string; primaryIdAttribute: string }>,
  onProgress?: (loaded: number, total: number) => void,
): Promise<Map<string, number>> {
  const counts = new Map<string, number>()
  if (!dataClient || config.useMock) return counts

  // Diagnostic: dump all table entity set names and primary IDs
  console.log(`[BridgeCounts] Starting count refresh for ${tables.length} tables:`)
  for (const t of tables.slice(0, 30)) {
    console.log(`  ${t.logicalName} → entitySet=${t.entitySetName}, idAttr=${t.primaryIdAttribute}`)
  }
  if (tables.length > 30) console.log(`  ... and ${tables.length - 30} more`)

  const failed: string[] = []

  for (let i = 0; i < tables.length; i++) {
    const t = tables[i]
    onProgress?.(i, tables.length)

    const count = await fetchCountViaBridge(t.entitySetName, t.primaryIdAttribute)
    if (count !== null) {
      counts.set(t.logicalName, count)
    } else {
      failed.push(t.logicalName)
    }

    // If bridge is confirmed broken at the mechanism level (not per-table), stop trying
    // Note: bridgeCountStatus is never set to 'failed' by per-table failures
    if (bridgeCountStatus === 'failed') break
  }

  onProgress?.(tables.length, tables.length)

  if (failed.length > 0) {
    console.log(`[BridgeCounts] Failed tables (${failed.length}): ${failed.join(', ')}`)
  }
  console.log(`[BridgeCounts] Succeeded: ${counts.size}/${tables.length}`)

  return counts
}

/**
 * Estimated record counts — fallback when bridge and Web API are both unavailable.
 */
const ESTIMATED_COUNTS: Record<string, number> = {
  // High-volume tables
  activitypointer: 15300,
  annotation: 4200,
  email: 12000,
  phonecall: 3500,
  task: 5800,
  appointment: 2100,
  cr_timeentry: 24500,
  slakpiinstance: 8500,
  queueitem: 6200,

  // Medium-volume tables
  contact: 8920,
  lead: 5600,
  incident: 12400,
  salesorder: 3200,
  opportunity: 1850,
  account: 2450,
  invoice: 2100,
  cr_milestone: 1200,
  feedback: 1800,
  connection: 2800,
  processsession: 4500,

  // Low-volume tables
  quote: 780,
  knowledgearticle: 890,
  product: 340,
  cr_project: 280,
  campaign: 120,
  entitlement: 150,
  competitor: 95,
  contract: 180,

  // System/config tables (very low)
  list: 45,
  pricelevel: 12,
  transactioncurrency: 5,
  organization: 1,
  businessunit: 8,
  territory: 15,
  role: 25,
  systemuser: 45,
  team: 20,
  subject: 35,
  calendar: 10,
  sla: 8,
  queue: 12,
  connectionrole: 15,
  discounttype: 5,
  contracttemplate: 3,
  ratingmodel: 4,
  ratingvalue: 20,

  // Solution/platform tables
  solution: 30,
  publisher: 10,
  sdkmessage: 400,
  sdkmessagefilter: 600,
  workflow: 150,
  processstage: 200,
  goal: 50,
  metric: 15,
  rollupfield: 25,
  goalrollupquery: 10,

  // SharePoint
  sharepointsite: 5,
  sharepointdocumentlocation: 120,

  // Activity subtypes
  socialactivity: 450,
  recurringappointmentmaster: 180,
  letter: 50,
  fax: 25,
  bulkoperation: 30,
  campaignactivity: 85,
  campaignresponse: 200,

  // Detail/child tables
  invoicedetail: 4500,
  quotedetail: 1800,
  salesorderdetail: 6800,
  opportunityproduct: 3200,
  opportunityclose: 900,
  orderclose: 1500,
  discount: 45,
  contractdetail: 350,

  // Bookable resources
  bookableresource: 60,
  bookableresourcebooking: 800,
  bookableresourcecategory: 15,
  characteristic: 30,

  // Knowledge
  knowledgebaserecord: 250,

  // Custom tables default
  cr_risk: 85,

  // AI/Platform
  aiplugin: 10,
  aipluginoperation: 25,
  msdyn_aiconfiguration: 15,
  msdyn_aimodel: 8,
  msdyn_aitemplate: 12,

  // Project Ops
  msdyn_project: 45,
  msdyn_projecttask: 350,
  msdyn_resourcerequirement: 120,
  msdyn_timeentry: 5000,
  msdyn_expense: 800,
  msdyn_estimate: 200,
  msdyn_projectteam: 150,
  msdyn_resourceassignment: 280,

  // Field Service
  msdyn_workorder: 2400,
  msdyn_workorderproduct: 4800,
  msdyn_workorderservice: 3600,
  msdyn_agreement: 180,
  msdyn_customerasset: 950,
  msdyn_incidenttype: 45,

  // Customer Insights
  msdynci_customerprofile: 5000,
  msdynci_customersegment: 25,

  // Omnichannel
  msdyn_livechatconfig: 5,
  msdyn_ocliveworkitem: 3200,
  msdyn_ocsession: 4500,

  // Finance
  msdyn_purchaseorder: 600,
  msdyn_warehouse: 15,
  msdyn_inventoryadjustment: 350,
}

/**
 * Attempt to fetch a record count via direct Dataverse Web API.
 * First tries without credentials (compatible with Access-Control-Allow-Origin: *),
 * then with credentials if the server requires auth cookies.
 * Returns null if the request fails (CORS, auth, etc.).
 */
async function fetchCountViaWebAPI(entitySetName: string): Promise<number | null> {
  // Inside Code Apps iframe, Web API is impossible (no-cred→401, cred→CORS blocked)
  if (config.environmentId) return null
  if (!config.orgUrl || webApiStatus === 'blocked') return null

  const url = `${config.orgUrl}/api/data/v9.2/${entitySetName}?$count=true&$top=0`
  const headers = {
    Accept: 'application/json',
    'OData-MaxVersion': '4.0',
    'OData-Version': '4.0',
  }

  // Try without credentials first — CORS wildcard (*) allows this
  try {
    const response = await fetch(url, { headers })
    if (response.ok) {
      const data = await response.json()
      const count = data['@odata.count']
      if (typeof count === 'number') {
        if (webApiStatus === 'untested') {
          webApiStatus = 'available'
          console.log('[Dataverse] Web API record counts available (no-credential mode)')
        }
        return count
      }
    }
    // 401/403 → try with credentials below
  } catch {
    // Network/CORS error without credentials — mark blocked immediately
    if (webApiStatus === 'untested') {
      webApiStatus = 'blocked'
      console.warn('[Dataverse] Web API blocked (CORS) — using estimates')
    }
    return null
  }

  // Second attempt: with credentials (works when origin is explicitly allowed)
  try {
    const response = await fetch(url, { credentials: 'include', headers })
    if (!response.ok) return null

    const data = await response.json()
    const count = data['@odata.count']
    if (typeof count === 'number') {
      if (webApiStatus === 'untested') {
        webApiStatus = 'available'
        console.log('[Dataverse] Web API record counts available (credential mode)')
      }
      return count
    }
    return null
  } catch {
    if (webApiStatus === 'untested') {
      webApiStatus = 'blocked'
      console.warn('[Dataverse] Web API blocked (CORS with credentials) — using estimates')
    }
    return null
  }
}

/**
 * Return a record count for a table.
 * Priority: bridge (Code Apps) > Web API (standalone) > 0 (unknown).
 * Estimates are only used in demo/mock mode — never when a real counting mechanism is available.
 */
export async function fetchRecordCount(logicalName: string, entitySetName: string, primaryIdAttr?: string): Promise<number> {
  if (config.useMock) return 0

  // Try bridge if inside Code Apps — use entity set name (bridge expects plural form)
  if (dataClient) {
    const idAttr = primaryIdAttr ?? `${logicalName}id`
    const count = await fetchCountViaBridge(entitySetName, idAttr)
    if (count !== null) {
      verifiedCountTables.add(logicalName)
      return count
    }
  }

  // Try Web API if org URL is set
  if (config.orgUrl && webApiStatus !== 'blocked') {
    const count = await fetchCountViaWebAPI(entitySetName)
    if (count !== null) return count
  }

  // If bridge or Web API is working, return 0 (will be filled in by background refresh)
  // Don't use fake estimates when a real counting mechanism is available
  if (bridgeCountStatus === 'available' || webApiStatus === 'available') {
    return 0
  }

  // Fall back to estimates only when no counting mechanism is available at all
  const estimate = ESTIMATED_COUNTS[logicalName]
  if (estimate !== undefined) return estimate

  if (logicalName.startsWith('msdyn_')) return 500
  if (logicalName.startsWith('cr_') || logicalName.startsWith('new_')) return 200
  return 100
}

/**
 * Format a record count for display.
 * Shows "—" for unknown (0) in live mode, "est." prefix for estimates, plain number for real counts.
 */
export function formatRecordCount(count: number): string {
  if (count === 0) {
    // In live mode, 0 means "not yet counted"
    if (!config.useMock) return '\u2014'
    return '0'
  }
  if (!config.useMock && webApiStatus !== 'available' && bridgeCountStatus !== 'available') {
    return `est. ${count.toLocaleString()}`
  }
  return count.toLocaleString()
}

/**
 * Refresh record counts for a list of tables via Web API.
 * Returns a map of logicalName → count for tables that were successfully fetched.
 */
export async function refreshRecordCounts(
  tables: Array<{ logicalName: string; entitySetName: string }>,
  onProgress?: (loaded: number, total: number) => void,
): Promise<Map<string, number>> {
  const counts = new Map<string, number>()
  if (!config.orgUrl || config.environmentId) return counts

  // Reset status so we re-test
  webApiStatus = 'untested'

  for (let i = 0; i < tables.length; i++) {
    const t = tables[i]
    onProgress?.(i, tables.length)
    const count = await fetchCountViaWebAPI(t.entitySetName)
    if (count !== null) {
      counts.set(t.logicalName, count)
    }
    // If first attempt was blocked, stop trying
    if ((webApiStatus as string) === 'blocked') break
  }

  onProgress?.(tables.length, tables.length)
  return counts
}
