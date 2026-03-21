/**
 * Dataverse connector wrapper.
 * When running inside Power Apps Code Apps, uses the @microsoft/power-apps SDK
 * for authenticated Dataverse access via the host bridge.
 * Falls back to mock data in local dev.
 *
 * NOTE: The Code Apps SDK bridge only supports executeAsync with 'getEntityMetadata'.
 * Data retrieval methods (retrieveMultipleRecordsAsync, retrieveRecordAsync) and
 * other executeAsync actions all return "Unsupported Dataverse action".
 * Record counts use estimates based on table type since live counts are unavailable.
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

// SDK data client — set during init when running inside Power Apps
let dataClient: any = null

/**
 * Initialize the Dataverse connection.
 * Auto-detects Power Apps host — if running inside a Code App,
 * switches to live mode. Uses dynamic import so a missing SDK can't crash the app.
 */
export async function initializeDataverse(): Promise<void> {
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
      console.log('[Dataverse] Connected via Power Apps host', {
        env: ctx.app.environmentId,
        user: ctx.user?.userPrincipalName,
      })

      // Initialize SDK data client for bridge-based Dataverse access
      try {
        const { getClient } = await import('@microsoft/power-apps/data')
        dataClient = getClient({})
        console.log('[Dataverse] SDK data client ready')
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
    return result?.data ?? result
  } catch (err) {
    console.warn(`[Dataverse] SDK metadata fetch for ${tableName} failed:`, err)
    return null
  }
}

/**
 * Fetch multiple records using the SDK.
 * NOTE: This does not work in the Code Apps bridge (returns "Unsupported Dataverse action").
 * Kept for potential future use if the bridge adds data retrieval support.
 */
export async function sdkRetrieveMultiple(tableName: string, options?: string): Promise<any> {
  if (!dataClient) return null
  try {
    const result = await dataClient.retrieveMultipleRecordsAsync(tableName, options)
    return result?.data ?? result
  } catch (err) {
    console.warn(`[Dataverse] SDK retrieveMultiple for ${tableName} failed:`, err)
    return null
  }
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

/**
 * Estimated record counts for well-known Dataverse/D365 tables.
 * The Code Apps SDK bridge only supports getEntityMetadata — no data retrieval —
 * so we use reasonable estimates to give the 3D visualization meaningful block sizing.
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
 * Return an estimated record count for a table.
 * Uses a lookup table of typical counts since the Code Apps SDK bridge
 * doesn't support data retrieval operations.
 */
export async function fetchRecordCount(logicalName: string, _entitySetName: string, _primaryIdAttr?: string): Promise<number> {
  if (config.useMock) return 0

  // Use estimated count from our lookup, or a default based on naming conventions
  const estimate = ESTIMATED_COUNTS[logicalName]
  if (estimate !== undefined) return estimate

  // For unknown tables, estimate based on naming patterns
  if (logicalName.startsWith('msdyn_')) return 500
  if (logicalName.startsWith('cr_') || logicalName.startsWith('new_')) return 200
  return 100
}
