/**
 * Dataverse metadata fetcher.
 * Retrieves table definitions, column schemas, and relationship metadata.
 * Uses the Power Apps SDK bridge for authenticated access inside Code Apps.
 */
import { getConfig, getDataClient, fetchEntityMetadataViaSDK, sdkRetrieveMultiple, fetchRecordCount, getWebApiStatus, getBridgeCountStatus } from './dataverse'

export interface TableMetadata {
  logicalName: string
  displayName: string
  description: string
  entitySetName: string
  primaryIdAttribute: string
  primaryNameAttribute: string
  recordCount: number
  columns: ColumnMetadata[]
  isCustom: boolean
  schemaName: string
}

export interface ColumnMetadata {
  logicalName: string
  displayName: string
  description: string
  attributeType: string
  isRequired: boolean
  maxLength?: number
  isPrimaryId: boolean
  isPrimaryName: boolean
}

export interface RelationshipMetadata {
  schemaName: string
  referencingEntity: string
  referencedEntity: string
  referencingAttribute: string
  referencedAttribute: string
  type: 'one-to-many' | 'many-to-many'
}

export interface AppMetadata {
  id: string
  name: string
  displayName: string
  description: string
  appType: 'model-driven' | 'canvas' | 'code'
  url: string
  solutionName: string
  associatedTables: string[]
}

/** Fetch all table definitions from Dataverse */
export async function fetchTableMetadata(): Promise<TableMetadata[]> {
  if (getConfig().useMock) {
    return getMockTableMetadata()
  }

  try {
    // First try: use SDK executeAsync with getEntityMetadata for well-known tables
    const client = getDataClient()
    if (client) {
      // Fetch metadata for a set of well-known tables via the SDK bridge
      const wellKnownTables = [
        'account', 'contact', 'lead', 'opportunity', 'incident',
        'knowledgearticle', 'entitlement', 'campaign', 'list',
        'product', 'pricelevel', 'transactioncurrency',
        'quote', 'salesorder', 'invoice', 'activitypointer', 'annotation',
      ]

      const results: TableMetadata[] = []
      const settled = await Promise.allSettled(
        wellKnownTables.map(async (tableName) => {
          const meta = await fetchEntityMetadataViaSDK(tableName)
          if (!meta) return null
          return {
            logicalName: meta.LogicalName ?? tableName,
            displayName: meta.DisplayName?.UserLocalizedLabel?.Label ?? tableName,
            description: meta.Description?.UserLocalizedLabel?.Label ?? '',
            entitySetName: meta.EntitySetName ?? `${tableName}s`,
            primaryIdAttribute: meta.PrimaryIdAttribute ?? `${tableName}id`,
            primaryNameAttribute: meta.PrimaryNameAttribute ?? 'name',
            recordCount: 0,
            columns: (meta.Attributes || []).slice(0, 20).map((a: any) => ({
              logicalName: a.LogicalName ?? '',
              displayName: a.DisplayName?.UserLocalizedLabel?.Label ?? a.LogicalName ?? '',
              description: a.Description?.UserLocalizedLabel?.Label ?? '',
              attributeType: mapAttributeType(a.AttributeType?.toString() ?? 'String'),
              isRequired: a.RequiredLevel?.Value === 2,
              maxLength: a.MaxLength,
              isPrimaryId: a.IsPrimaryId ?? false,
              isPrimaryName: a.IsPrimaryName ?? false,
            })),
            isCustom: meta.IsCustomEntity ?? false,
            schemaName: meta.SchemaName ?? tableName,
          } as TableMetadata
        }),
      )

      for (const s of settled) {
        if (s.status === 'fulfilled' && s.value) {
          results.push(s.value)
        }
      }

      if (results.length > 0) {
        console.log(`[Dataverse] Loaded ${results.length} tables via SDK`)
        // Fetch record counts sequentially — bail after first failure
        for (const t of results) {
          if (getWebApiStatus() === 'blocked' && getBridgeCountStatus() === 'failed') break
          t.recordCount = await fetchRecordCount(t.logicalName, t.entitySetName, t.primaryIdAttribute)
        }
        console.log(`[Dataverse] Record counts loaded`)
        return results
      }
    }

    console.warn('[Dataverse] SDK metadata fetch returned no tables, using mock data')
    return getMockTableMetadata()
  } catch (err) {
    console.warn('[Dataverse] Live table fetch failed, using mock data:', err)
    return getMockTableMetadata()
  }
}

/** Fetch columns for a specific table */
export async function fetchColumnMetadata(tableLogicalName: string): Promise<ColumnMetadata[]> {
  if (getConfig().useMock) {
    const tables = getMockTableMetadata()
    const table = tables.find((t) => t.logicalName === tableLogicalName)
    return table?.columns ?? []
  }

  try {
    const meta = await fetchEntityMetadataViaSDK(tableLogicalName)
    if (meta?.Attributes) {
      return meta.Attributes.map((a: any) => ({
        logicalName: a.LogicalName ?? '',
        displayName: a.DisplayName?.UserLocalizedLabel?.Label ?? a.LogicalName ?? '',
        description: a.Description?.UserLocalizedLabel?.Label ?? '',
        attributeType: mapAttributeType(a.AttributeType?.toString() ?? 'String'),
        isRequired: a.RequiredLevel?.Value === 2,
        maxLength: a.MaxLength,
        isPrimaryId: a.IsPrimaryId ?? false,
        isPrimaryName: a.IsPrimaryName ?? false,
      }))
    }
  } catch (err) {
    console.warn(`[Dataverse] Column fetch for ${tableLogicalName} failed:`, err)
  }

  return []
}

/** Fetch relationships between tables */
export async function fetchRelationshipMetadata(): Promise<RelationshipMetadata[]> {
  if (getConfig().useMock) {
    return getMockRelationships()
  }

  try {
    // Use SDK to get relationships from well-known tables' expanded metadata
    const client = getDataClient()
    if (client) {
      const knownTables = [
        'account', 'contact', 'lead', 'opportunity', 'incident',
        'campaign', 'product', 'quote', 'salesorder', 'invoice',
      ]

      const rels: RelationshipMetadata[] = []
      const seenSchemas = new Set<string>()

      const settled = await Promise.allSettled(
        knownTables.map((t) => fetchEntityMetadataViaSDK(t)),
      )

      for (const s of settled) {
        if (s.status !== 'fulfilled' || !s.value) continue
        const meta = s.value

        for (const r of (meta.OneToManyRelationships || [])) {
          if (seenSchemas.has(r.SchemaName)) continue
          seenSchemas.add(r.SchemaName)
          rels.push({
            schemaName: r.SchemaName,
            referencingEntity: r.ReferencingEntity,
            referencedEntity: r.ReferencedEntity,
            referencingAttribute: r.ReferencingAttribute ?? '',
            referencedAttribute: r.ReferencedAttribute ?? '',
            type: 'one-to-many',
          })
        }

        for (const r of (meta.ManyToOneRelationships || [])) {
          if (seenSchemas.has(r.SchemaName)) continue
          seenSchemas.add(r.SchemaName)
          rels.push({
            schemaName: r.SchemaName,
            referencingEntity: r.ReferencingEntity,
            referencedEntity: r.ReferencedEntity,
            referencingAttribute: r.ReferencingAttribute ?? '',
            referencedAttribute: r.ReferencedAttribute ?? '',
            type: 'one-to-many',
          })
        }

        for (const r of (meta.ManyToManyRelationships || [])) {
          if (seenSchemas.has(r.SchemaName)) continue
          seenSchemas.add(r.SchemaName)
          rels.push({
            schemaName: r.SchemaName,
            referencingEntity: r.Entity1LogicalName,
            referencedEntity: r.Entity2LogicalName,
            referencingAttribute: '',
            referencedAttribute: '',
            type: 'many-to-many',
          })
        }
      }

      if (rels.length > 0) {
        console.log(`[Dataverse] Loaded ${rels.length} relationships via SDK`)
        return rels
      }
    }

    console.warn('[Dataverse] No relationships from SDK, using mock data')
    return getMockRelationships()
  } catch (err) {
    console.warn('[Dataverse] Live relationship fetch failed, using mock data:', err)
    return getMockRelationships()
  }
}

/** Fetch app metadata */
export async function fetchAppMetadata(): Promise<AppMetadata[]> {
  if (getConfig().useMock) {
    return getMockApps()
  }

  try {
    const result = await sdkRetrieveMultiple(
      'appmodule',
      '?$select=name,uniquename,description,url,appmoduleid',
    )

    if (result?.entities || result?.value) {
      const entities = result.entities ?? result.value ?? []
      const apps = entities.map((a: any) => ({
        id: a.appmoduleid ?? '',
        name: a.uniquename ?? '',
        displayName: a.name ?? '',
        description: a.description ?? '',
        appType: 'model-driven' as const,
        url: a.url ?? '',
        solutionName: 'Default',
        associatedTables: [],
      }))
      if (apps.length > 0) {
        console.log(`[Dataverse] Loaded ${apps.length} apps via SDK`)
        return apps
      }
    }

    console.warn('[Dataverse] No apps from SDK, using mock data')
    return getMockApps()
  } catch (err) {
    console.warn('[Dataverse] Live app fetch failed, using mock data:', err)
    return getMockApps()
  }
}

/**
 * Extended list of common Dataverse/D365 table names to discover.
 * These are probed in batches after the initial well-known tables load.
 */
const DISCOVERABLE_TABLES = [
  // Core / System
  'systemuser', 'team', 'businessunit', 'role', 'organization',
  'connection', 'connectionrole', 'territory', 'queue', 'queueitem',
  'subject', 'calendar', 'sla', 'slakpiinstance',
  // Activity
  'email', 'phonecall', 'appointment', 'task', 'letter', 'fax',
  'socialactivity', 'recurringappointmentmaster',
  // Sales extended
  'competitor', 'opportunityclose', 'orderclose', 'invoicedetail',
  'quotedetail', 'salesorderdetail', 'opportunityproduct',
  'discount', 'discounttype',
  // Service extended
  'contract', 'contractdetail', 'contracttemplate',
  'knowledgebaserecord', 'feedback',
  'bookableresource', 'bookableresourcebooking', 'bookableresourcecategory',
  'characteristic', 'ratingmodel', 'ratingvalue',
  // Marketing extended
  'campaignactivity', 'campaignresponse', 'bulkoperation',
  // Goal / Metric
  'goal', 'metric', 'rollupfield', 'goalrollupquery',
  // Process
  'workflow', 'processsession', 'processstage',
  // Document
  'sharepointsite', 'sharepointdocumentlocation',
  // Custom / Solutions
  'solution', 'publisher', 'sdkmessage', 'sdkmessagefilter',
  // Power Platform
  'aiplugin', 'aipluginoperation', 'msdyn_aiconfiguration',
  'msdyn_aimodel', 'msdyn_aitemplate',
  // Project Ops
  'msdyn_project', 'msdyn_projecttask', 'msdyn_resourcerequirement',
  'msdyn_timeentry', 'msdyn_expense', 'msdyn_estimate',
  'msdyn_projectteam', 'msdyn_resourceassignment',
  // Field Service
  'msdyn_workorder', 'msdyn_workorderproduct', 'msdyn_workorderservice',
  'msdyn_agreement', 'msdyn_customerasset', 'msdyn_incidenttype',
  // Customer Insights
  'msdynci_customerprofile', 'msdynci_customersegment',
  // Omnichannel
  'msdyn_livechatconfig', 'msdyn_ocliveworkitem', 'msdyn_ocsession',
  // Finance
  'msdyn_purchaseorder', 'msdyn_warehouse', 'msdyn_inventoryadjustment',
]

/**
 * Discover all available tables from the environment.
 * Fetches in batches and calls the onBatch callback with each batch of results.
 * Returns the total count of successfully discovered tables.
 */
export async function discoverAllTables(
  existingTableNames: Set<string>,
  onBatch: (tables: TableMetadata[]) => void,
  onProgress: (loaded: number, total: number, phase: string) => void,
): Promise<number> {
  // Filter out tables we already have
  const toDiscover = DISCOVERABLE_TABLES.filter((t) => !existingTableNames.has(t))

  if (toDiscover.length === 0) {
    onProgress(0, 0, 'All known tables loaded')
    return 0
  }

  const BATCH_SIZE = 5
  let totalLoaded = 0

  for (let i = 0; i < toDiscover.length; i += BATCH_SIZE) {
    const batch = toDiscover.slice(i, i + BATCH_SIZE)
    onProgress(i, toDiscover.length, `Discovering tables... (${i}/${toDiscover.length})`)

    const settled = await Promise.allSettled(
      batch.map(async (tableName) => {
        const meta = await fetchEntityMetadataViaSDK(tableName)
        if (!meta) return null
        return {
          logicalName: meta.LogicalName ?? tableName,
          displayName: meta.DisplayName?.UserLocalizedLabel?.Label ?? tableName,
          description: meta.Description?.UserLocalizedLabel?.Label ?? '',
          entitySetName: meta.EntitySetName ?? `${tableName}s`,
          primaryIdAttribute: meta.PrimaryIdAttribute ?? `${tableName}id`,
          primaryNameAttribute: meta.PrimaryNameAttribute ?? 'name',
          recordCount: 0,
          columns: (meta.Attributes || []).slice(0, 20).map((a: any) => ({
            logicalName: a.LogicalName ?? '',
            displayName: a.DisplayName?.UserLocalizedLabel?.Label ?? a.LogicalName ?? '',
            description: a.Description?.UserLocalizedLabel?.Label ?? '',
            attributeType: mapAttributeType(a.AttributeType?.toString() ?? 'String'),
            isRequired: a.RequiredLevel?.Value === 2,
            maxLength: a.MaxLength,
            isPrimaryId: a.IsPrimaryId ?? false,
            isPrimaryName: a.IsPrimaryName ?? false,
          })),
          isCustom: meta.IsCustomEntity ?? false,
          schemaName: meta.SchemaName ?? tableName,
        } as TableMetadata
      }),
    )

    const batchResults: TableMetadata[] = []
    for (const s of settled) {
      if (s.status === 'fulfilled' && s.value) {
        batchResults.push(s.value)
      }
    }

    if (batchResults.length > 0) {
      // Fetch record counts sequentially — bail after first failure
      for (const t of batchResults) {
        if (getWebApiStatus() === 'blocked' && getBridgeCountStatus() === 'failed') break
        t.recordCount = await fetchRecordCount(t.logicalName, t.entitySetName, t.primaryIdAttribute)
      }
      totalLoaded += batchResults.length
      onBatch(batchResults)
    }
  }

  onProgress(toDiscover.length, toDiscover.length, `Discovery complete — ${totalLoaded} additional tables found`)
  return totalLoaded
}

function mapAttributeType(type: string): string {
  const map: Record<string, string> = {
    String: 'string',
    Memo: 'memo',
    Integer: 'number',
    BigInt: 'number',
    Double: 'number',
    Decimal: 'number',
    Money: 'currency',
    Boolean: 'boolean',
    DateTime: 'datetime',
    Lookup: 'lookup',
    Customer: 'lookup',
    Owner: 'lookup',
    Picklist: 'string',
    State: 'string',
    Status: 'string',
    Uniqueidentifier: 'string',
  }
  return map[type] ?? 'string'
}

// ─── Mock Data ──────────────────────────────────────────────────────────────

function getMockTableMetadata(): TableMetadata[] {
  return [
    mockTable('account', 'Account', 2450, false, [
      col('name', 'Account Name', 'string', true),
      col('accountnumber', 'Account Number', 'string', false),
      col('revenue', 'Annual Revenue', 'currency', false),
      col('industrycode', 'Industry', 'string', false),
      col('telephone1', 'Phone', 'string', false),
      col('emailaddress1', 'Email', 'string', false),
      col('address1_city', 'City', 'string', false),
      col('createdon', 'Created On', 'datetime', false),
    ]),
    mockTable('contact', 'Contact', 8920, false, [
      col('fullname', 'Full Name', 'string', true),
      col('emailaddress1', 'Email', 'string', false),
      col('telephone1', 'Phone', 'string', false),
      col('jobtitle', 'Job Title', 'string', false),
      col('parentcustomerid', 'Company', 'lookup', false),
      col('address1_city', 'City', 'string', false),
      col('birthdate', 'Birthday', 'datetime', false),
    ]),
    mockTable('activitypointer', 'Activity', 15300, false, [
      col('subject', 'Subject', 'string', true),
      col('description', 'Description', 'memo', false),
      col('scheduledstart', 'Start Date', 'datetime', false),
      col('scheduledend', 'End Date', 'datetime', false),
      col('regardingobjectid', 'Regarding', 'lookup', false),
      col('activitytypecode', 'Type', 'string', false),
    ]),
    mockTable('annotation', 'Note', 4200, false, [
      col('subject', 'Title', 'string', true),
      col('notetext', 'Note Text', 'memo', false),
      col('objectid', 'Regarding', 'lookup', false),
      col('isdocument', 'Is Document', 'boolean', false),
      col('createdon', 'Created On', 'datetime', false),
    ]),
    mockTable('opportunity', 'Opportunity', 1850, false, [
      col('name', 'Topic', 'string', true),
      col('estimatedvalue', 'Est. Revenue', 'currency', false),
      col('closeprobability', 'Probability', 'number', false),
      col('estimatedclosedate', 'Est. Close Date', 'datetime', false),
      col('parentaccountid', 'Account', 'lookup', false),
      col('parentcontactid', 'Contact', 'lookup', false),
      col('stepname', 'Pipeline Phase', 'string', false),
      col('statuscode', 'Status', 'string', false),
    ]),
    mockTable('lead', 'Lead', 5600, false, [
      col('fullname', 'Name', 'string', true),
      col('companyname', 'Company', 'string', false),
      col('emailaddress1', 'Email', 'string', false),
      col('telephone1', 'Phone', 'string', false),
      col('leadsourcecode', 'Lead Source', 'string', false),
      col('estimatedamount', 'Est. Amount', 'currency', false),
      col('statuscode', 'Status', 'string', false),
    ]),
    mockTable('quote', 'Quote', 780, false, [
      col('name', 'Name', 'string', true),
      col('totalamount', 'Total', 'currency', false),
      col('customerid', 'Customer', 'lookup', false),
      col('effectivefrom', 'Effective From', 'datetime', false),
      col('effectiveto', 'Effective To', 'datetime', false),
    ]),
    mockTable('salesorder', 'Order', 3200, false, [
      col('name', 'Name', 'string', true),
      col('totalamount', 'Total Amount', 'currency', false),
      col('customerid', 'Customer', 'lookup', false),
      col('submitdate', 'Submit Date', 'datetime', false),
      col('statuscode', 'Status', 'string', false),
    ]),
    mockTable('invoice', 'Invoice', 2100, false, [
      col('name', 'Name', 'string', true),
      col('totalamount', 'Total', 'currency', false),
      col('customerid', 'Customer', 'lookup', false),
      col('duedate', 'Due Date', 'datetime', false),
      col('ispricelocked', 'Price Locked', 'boolean', false),
    ]),
    mockTable('incident', 'Case', 12400, false, [
      col('title', 'Title', 'string', true),
      col('description', 'Description', 'memo', false),
      col('prioritycode', 'Priority', 'number', false),
      col('customerid', 'Customer', 'lookup', false),
      col('statuscode', 'Status', 'string', false),
      col('createdon', 'Created On', 'datetime', false),
      col('resolveby', 'Resolve By', 'datetime', false),
    ]),
    mockTable('knowledgearticle', 'Knowledge Article', 890, false, [
      col('title', 'Title', 'string', true),
      col('content', 'Content', 'memo', false),
      col('keywords', 'Keywords', 'string', false),
      col('publishon', 'Publish Date', 'datetime', false),
      col('isinternal', 'Internal', 'boolean', false),
    ]),
    mockTable('entitlement', 'Entitlement', 150, false, [
      col('name', 'Name', 'string', true),
      col('customerid', 'Customer', 'lookup', false),
      col('startdate', 'Start Date', 'datetime', false),
      col('enddate', 'End Date', 'datetime', false),
      col('totalterms', 'Total Terms', 'number', false),
    ]),
    mockTable('campaign', 'Campaign', 120, false, [
      col('name', 'Name', 'string', true),
      col('budgetedcost', 'Budget', 'currency', false),
      col('actualstart', 'Start Date', 'datetime', false),
      col('actualend', 'End Date', 'datetime', false),
      col('statuscode', 'Status', 'string', false),
      col('typecode', 'Type', 'string', false),
    ]),
    mockTable('list', 'Marketing List', 45, false, [
      col('listname', 'Name', 'string', true),
      col('membercount', 'Members', 'number', false),
      col('type', 'Type', 'boolean', false),
      col('createdon', 'Created On', 'datetime', false),
    ]),
    mockTable('product', 'Product', 340, false, [
      col('name', 'Name', 'string', true),
      col('productnumber', 'Product Number', 'string', false),
      col('price', 'Price', 'currency', false),
      col('quantityonhand', 'In Stock', 'number', false),
      col('isactive', 'Active', 'boolean', false),
    ]),
    mockTable('pricelevel', 'Price List', 12, false, [
      col('name', 'Name', 'string', true),
      col('begindate', 'Begin Date', 'datetime', false),
      col('enddate', 'End Date', 'datetime', false),
      col('description', 'Description', 'memo', false),
    ]),
    mockTable('transactioncurrency', 'Currency', 5, false, [
      col('currencyname', 'Currency Name', 'string', true),
      col('isocurrencycode', 'ISO Code', 'string', false),
      col('exchangerate', 'Exchange Rate', 'number', false),
      col('currencysymbol', 'Symbol', 'string', false),
    ]),
    mockTable('cr_project', 'Project', 280, true, [
      col('cr_name', 'Project Name', 'string', true),
      col('cr_startdate', 'Start Date', 'datetime', false),
      col('cr_enddate', 'End Date', 'datetime', false),
      col('cr_budget', 'Budget', 'currency', false),
      col('cr_status', 'Status', 'string', false),
      col('cr_accountid', 'Client', 'lookup', false),
    ]),
    mockTable('cr_milestone', 'Milestone', 1200, true, [
      col('cr_name', 'Name', 'string', true),
      col('cr_duedate', 'Due Date', 'datetime', false),
      col('cr_completed', 'Completed', 'boolean', false),
      col('cr_projectid', 'Project', 'lookup', false),
      col('cr_notes', 'Notes', 'memo', false),
    ]),
    mockTable('cr_timeentry', 'Time Entry', 24500, true, [
      col('cr_description', 'Description', 'string', true),
      col('cr_duration', 'Duration (hrs)', 'number', false),
      col('cr_date', 'Date', 'datetime', false),
      col('cr_projectid', 'Project', 'lookup', false),
      col('cr_billable', 'Billable', 'boolean', false),
    ]),
    mockTable('cr_risk', 'Risk Register', 85, true, [
      col('cr_name', 'Risk Name', 'string', true),
      col('cr_probability', 'Probability', 'number', false),
      col('cr_impact', 'Impact', 'number', false),
      col('cr_mitigationstrategy', 'Mitigation', 'memo', false),
      col('cr_projectid', 'Project', 'lookup', false),
    ]),
  ]
}

function getMockRelationships(): RelationshipMetadata[] {
  return [
    rel('account', 'contact', 'one-to-many'),
    rel('account', 'opportunity', 'one-to-many'),
    rel('account', 'incident', 'one-to-many'),
    rel('account', 'annotation', 'one-to-many'),
    rel('account', 'salesorder', 'one-to-many'),
    rel('account', 'invoice', 'one-to-many'),
    rel('account', 'cr_project', 'one-to-many'),
    rel('contact', 'activitypointer', 'one-to-many'),
    rel('contact', 'incident', 'one-to-many'),
    rel('contact', 'lead', 'one-to-many'),
    rel('contact', 'opportunity', 'one-to-many'),
    rel('opportunity', 'quote', 'one-to-many'),
    rel('quote', 'salesorder', 'one-to-many'),
    rel('salesorder', 'invoice', 'one-to-many'),
    rel('incident', 'knowledgearticle', 'many-to-many'),
    rel('incident', 'entitlement', 'one-to-many'),
    rel('campaign', 'list', 'one-to-many'),
    rel('campaign', 'lead', 'one-to-many'),
    rel('product', 'pricelevel', 'many-to-many'),
    rel('opportunity', 'product', 'many-to-many'),
    rel('cr_project', 'cr_milestone', 'one-to-many'),
    rel('cr_project', 'cr_timeentry', 'one-to-many'),
    rel('cr_project', 'cr_risk', 'one-to-many'),
  ]
}

function getMockApps(): AppMetadata[] {
  return [
    {
      id: 'app-sales-hub',
      name: 'saleshub',
      displayName: 'Sales Hub',
      description: 'Manage your sales pipeline, accounts, and opportunities',
      appType: 'model-driven',
      url: '#/apps/sales-hub',
      solutionName: 'Sales',
      associatedTables: ['account', 'contact', 'opportunity', 'lead', 'quote', 'salesorder', 'invoice'],
    },
    {
      id: 'app-cs-hub',
      name: 'cshub',
      displayName: 'Customer Service Hub',
      description: 'Handle cases, knowledge articles, and entitlements',
      appType: 'model-driven',
      url: '#/apps/cs-hub',
      solutionName: 'Service',
      associatedTables: ['incident', 'knowledgearticle', 'entitlement', 'contact', 'account'],
    },
    {
      id: 'app-marketing',
      name: 'marketing',
      displayName: 'Marketing',
      description: 'Plan and execute marketing campaigns',
      appType: 'model-driven',
      url: '#/apps/marketing',
      solutionName: 'Marketing',
      associatedTables: ['campaign', 'list', 'lead', 'contact'],
    },
    {
      id: 'app-project-tracker',
      name: 'projecttracker',
      displayName: 'Project Tracker',
      description: 'Track projects, milestones, and time entries',
      appType: 'canvas',
      url: '#/apps/project-tracker',
      solutionName: 'Custom Projects',
      associatedTables: ['cr_project', 'cr_milestone', 'cr_timeentry', 'cr_risk'],
    },
    {
      id: 'app-admin',
      name: 'admin',
      displayName: 'Admin Center',
      description: 'System administration and configuration',
      appType: 'model-driven',
      url: '#/apps/admin',
      solutionName: 'System',
      associatedTables: ['account', 'contact'],
    },
  ]
}

function mockTable(
  logicalName: string,
  displayName: string,
  recordCount: number,
  isCustom: boolean,
  columns: ColumnMetadata[],
): TableMetadata {
  return {
    logicalName,
    displayName,
    description: `${displayName} table`,
    entitySetName: `${logicalName}s`,
    primaryIdAttribute: `${logicalName}id`,
    primaryNameAttribute: columns[0]?.logicalName ?? 'name',
    recordCount,
    columns,
    isCustom,
    schemaName: isCustom ? `cr_${logicalName}` : logicalName,
  }
}

function col(logicalName: string, displayName: string, type: string, isRequired: boolean): ColumnMetadata {
  return {
    logicalName,
    displayName,
    description: '',
    attributeType: type,
    isRequired,
    isPrimaryId: false,
    isPrimaryName: isRequired,
  }
}

function rel(from: string, to: string, type: 'one-to-many' | 'many-to-many'): RelationshipMetadata {
  return {
    schemaName: `${from}_${to}`,
    referencingEntity: to,
    referencedEntity: from,
    referencingAttribute: `${from}id`,
    referencedAttribute: `${from}id`,
    type,
  }
}
