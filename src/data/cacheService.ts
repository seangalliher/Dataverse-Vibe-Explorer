/**
 * Cache Service — persists table metadata and user preferences to Dataverse.
 * Uses the generated services from `pac code add-data-source`.
 * Falls back gracefully when running in mock/local mode.
 */
import { Dve_tablecachesService } from '@/generated/services/Dve_tablecachesService'
import { Dve_userpreferencesService } from '@/generated/services/Dve_userpreferencesService'
import type { Dve_tablecaches } from '@/generated/models/Dve_tablecachesModel'
import type { Dve_userpreferences } from '@/generated/models/Dve_userpreferencesModel'
import type { TableMetadata, ColumnMetadata } from './metadata'
import { getConfig } from './dataverse'

// ─── Table Cache ──────────────────────────────────────────────────────────────
// The dve_tablecache table is shared across ALL users in the org.
// Any user's metadata sync updates the shared cache for everyone.

export async function loadCachedTables(): Promise<TableMetadata[]> {
  if (getConfig().useMock) return []

  try {
    const result = await Dve_tablecachesService.getAll({
      select: [
        'dve_tablecacheid', 'dve_name', 'dve_logicalname', 'dve_entitysetname',
        'dve_primaryidattribute', 'dve_primarynameattribute', 'dve_recordcount',
        'dve_domain', 'dve_iscustom', 'dve_schemaname', 'dve_columnsjson',
        'dve_lastsyncdate',
      ],
      top: 500,
    })

    if (!result.data || result.data.length === 0) return []

    console.log(`[Cache] Loaded ${result.data.length} cached tables`)
    return result.data.map(mapCacheRowToMetadata)
  } catch (err) {
    console.warn('[Cache] Failed to load cached tables:', err)
    return []
  }
}

export async function saveCachedTables(tables: TableMetadata[]): Promise<void> {
  if (getConfig().useMock || tables.length === 0) return

  try {
    // Load existing cache to determine create vs update
    const existing = await Dve_tablecachesService.getAll({
      select: ['dve_tablecacheid', 'dve_logicalname'],
      top: 500,
    })

    const existingMap = new Map<string, string>()
    if (existing.data) {
      for (const row of existing.data) {
        existingMap.set(row.dve_logicalname, row.dve_tablecacheid)
      }
    }

    const now = new Date().toISOString()
    let saved = 0

    for (const t of tables) {
      const record = mapMetadataToCacheRow(t, now)
      const existingId = existingMap.get(t.logicalName)

      try {
        if (existingId) {
          await Dve_tablecachesService.update(existingId, record)
        } else {
          await Dve_tablecachesService.create(record as any)
        }
        saved++
      } catch (err) {
        console.warn(`[Cache] Failed to save ${t.logicalName}:`, err)
      }
    }

    console.log(`[Cache] Saved ${saved}/${tables.length} tables to cache`)
  } catch (err) {
    console.warn('[Cache] Failed to save table cache:', err)
  }
}

function mapCacheRowToMetadata(row: Dve_tablecaches): TableMetadata {
  let columns: ColumnMetadata[] = []
  try {
    if (row.dve_columnsjson) columns = JSON.parse(row.dve_columnsjson)
  } catch { /* invalid JSON */ }

  return {
    logicalName: row.dve_logicalname,
    displayName: row.dve_name,
    description: '',
    entitySetName: row.dve_entitysetname ?? `${row.dve_logicalname}s`,
    primaryIdAttribute: row.dve_primaryidattribute ?? `${row.dve_logicalname}id`,
    primaryNameAttribute: row.dve_primarynameattribute ?? 'name',
    recordCount: parseInt(row.dve_recordcount ?? '0', 10) || 0,
    columns,
    isCustom: row.dve_iscustom === 1,
    schemaName: row.dve_schemaname ?? row.dve_logicalname,
  }
}

function mapMetadataToCacheRow(t: TableMetadata, syncDate: string) {
  return {
    dve_name: t.displayName,
    dve_logicalname: t.logicalName,
    dve_entitysetname: t.entitySetName,
    dve_primaryidattribute: t.primaryIdAttribute,
    dve_primarynameattribute: t.primaryNameAttribute,
    dve_recordcount: String(t.recordCount),
    dve_domain: '', // domain is assigned by sceneGraph, not stored in TableMetadata
    dve_iscustom: (t.isCustom ? 1 : 0) as 0 | 1,
    dve_schemaname: t.schemaName,
    dve_columnsjson: JSON.stringify(t.columns),
    dve_lastsyncdate: syncDate,
  }
}

// ─── User Preferences ────────────────────────────────────────────────────────

export interface UserPreferences {
  id?: string // dve_userpreferenceid — set when loaded from Dataverse
  orgUrl: string
  hiddenDomains: string[]
  hiddenTableIds: string[]
  highContrast: boolean
  reducedMotion: boolean
  extra: Record<string, unknown> // future-proof JSON blob
}

const DEFAULT_PREFS: UserPreferences = {
  orgUrl: '',
  hiddenDomains: [],
  hiddenTableIds: [],
  highContrast: false,
  reducedMotion: false,
  extra: {},
}

export async function loadUserPreferences(userId: string): Promise<UserPreferences> {
  if (getConfig().useMock || !userId) return { ...DEFAULT_PREFS }

  try {
    const result = await Dve_userpreferencesService.getAll({
      filter: `dve_userid eq '${userId}'`,
      select: [
        'dve_userpreferenceid', 'dve_orgurl', 'dve_hiddendomainsjson',
        'dve_hiddentableidsjson', 'dve_highcontrast', 'dve_reducedmotion',
        'dve_preferencesjson',
      ],
      top: 1,
    })

    if (!result.data || result.data.length === 0) return { ...DEFAULT_PREFS }

    const row = result.data[0]
    console.log('[Cache] Loaded user preferences')
    return mapPrefRowToPreferences(row)
  } catch (err) {
    console.warn('[Cache] Failed to load preferences:', err)
    return { ...DEFAULT_PREFS }
  }
}

export async function saveUserPreferences(userId: string, displayName: string, prefs: UserPreferences): Promise<void> {
  if (getConfig().useMock || !userId) return

  const record = {
    dve_name: displayName || userId,
    dve_userid: userId,
    dve_orgurl: prefs.orgUrl || undefined,
    dve_hiddendomainsjson: prefs.hiddenDomains.length > 0 ? JSON.stringify(prefs.hiddenDomains) : undefined,
    dve_hiddentableidsjson: prefs.hiddenTableIds.length > 0 ? JSON.stringify(prefs.hiddenTableIds) : undefined,
    dve_highcontrast: (prefs.highContrast ? 1 : 0) as 0 | 1,
    dve_reducedmotion: (prefs.reducedMotion ? 1 : 0) as 0 | 1,
    dve_preferencesjson: Object.keys(prefs.extra).length > 0 ? JSON.stringify(prefs.extra) : undefined,
  }

  try {
    if (prefs.id) {
      await Dve_userpreferencesService.update(prefs.id, record)
    } else {
      const result = await Dve_userpreferencesService.create(record as any)
      if (result.data) {
        prefs.id = result.data.dve_userpreferenceid
      }
    }
    console.log('[Cache] Saved user preferences')
  } catch (err) {
    console.warn('[Cache] Failed to save preferences:', err)
  }
}

function mapPrefRowToPreferences(row: Dve_userpreferences): UserPreferences {
  let hiddenDomains: string[] = []
  let hiddenTableIds: string[] = []
  let extra: Record<string, unknown> = {}

  try { if (row.dve_hiddendomainsjson) hiddenDomains = JSON.parse(row.dve_hiddendomainsjson) } catch {}
  try { if (row.dve_hiddentableidsjson) hiddenTableIds = JSON.parse(row.dve_hiddentableidsjson) } catch {}
  try { if (row.dve_preferencesjson) extra = JSON.parse(row.dve_preferencesjson) } catch {}

  return {
    id: row.dve_userpreferenceid,
    orgUrl: row.dve_orgurl ?? '',
    hiddenDomains,
    hiddenTableIds,
    highContrast: row.dve_highcontrast === 1,
    reducedMotion: row.dve_reducedmotion === 1,
    extra,
  }
}

/**
 * Update only the record counts in the cache — lighter than a full saveCachedTables.
 * Used after background bridge-based count refresh.
 */
export async function updateCachedRecordCounts(counts: Map<string, number>): Promise<void> {
  if (getConfig().useMock || counts.size === 0) return

  try {
    const existing = await Dve_tablecachesService.getAll({
      select: ['dve_tablecacheid', 'dve_logicalname'],
      top: 500,
    })

    if (!existing.data) return

    const now = new Date().toISOString()
    let updated = 0

    for (const row of existing.data) {
      const count = counts.get(row.dve_logicalname)
      if (count !== undefined) {
        try {
          await Dve_tablecachesService.update(row.dve_tablecacheid, {
            dve_recordcount: String(count),
            dve_lastsyncdate: now,
          })
          updated++
        } catch { /* skip individual failures */ }
      }
    }

    if (updated > 0) {
      console.log(`[Cache] Updated ${updated} record counts`)
    }
  } catch (err) {
    console.warn('[Cache] Failed to update record counts:', err)
  }
}

// ─── Org-Wide Config ─────────────────────────────────────────────────────────
// Stores org URL in a shared record accessible to all users.
// Uses a sentinel dve_userid so any user can read/write it.

const ORG_CONFIG_USER_ID = '__ORG_CONFIG__'

export async function loadOrgUrl(): Promise<string> {
  if (getConfig().useMock) return ''

  try {
    const result = await Dve_userpreferencesService.getAll({
      filter: `dve_userid eq '${ORG_CONFIG_USER_ID}'`,
      select: ['dve_userpreferenceid', 'dve_orgurl'],
      top: 1,
    })

    if (result.data && result.data.length > 0 && result.data[0].dve_orgurl) {
      console.log('[Cache] Loaded org-wide URL:', result.data[0].dve_orgurl)
      return result.data[0].dve_orgurl
    }
  } catch (err) {
    console.warn('[Cache] Failed to load org URL:', err)
  }

  return ''
}

export async function saveOrgUrl(orgUrl: string): Promise<void> {
  if (getConfig().useMock || !orgUrl) return

  try {
    // Check if org config record already exists
    const existing = await Dve_userpreferencesService.getAll({
      filter: `dve_userid eq '${ORG_CONFIG_USER_ID}'`,
      select: ['dve_userpreferenceid'],
      top: 1,
    })

    const record = {
      dve_name: 'Org Configuration',
      dve_userid: ORG_CONFIG_USER_ID,
      dve_orgurl: orgUrl,
    }

    if (existing.data && existing.data.length > 0) {
      await Dve_userpreferencesService.update(existing.data[0].dve_userpreferenceid, record)
    } else {
      await Dve_userpreferencesService.create(record as any)
    }

    console.log('[Cache] Saved org-wide URL:', orgUrl)
  } catch (err) {
    console.warn('[Cache] Failed to save org URL:', err)
  }
}
