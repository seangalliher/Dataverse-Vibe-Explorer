import { useEffect, useMemo, useState, useCallback } from 'react'
import { Text } from '@react-three/drei'
import { useAppStore, type TableNode } from '@/store/appStore'
import { fetchTableMetadata, fetchRelationshipMetadata, fetchAppMetadata, discoverAllTables } from '@/data/metadata'
import { buildSceneGraph, positionNewTables, getDomainBlockCenter } from '@/data/sceneGraph'
import { CDM_DOMAINS, getDomainColors } from '@/utils/colors'
import { getConfig, configureDataverse, refreshRecordCountsViaBridge } from '@/data/dataverse'
import { loadCachedTables, saveCachedTables, loadOrgUrl, updateCachedRecordCounts } from '@/data/cacheService'
import type { VibeCreationState } from '@/agent/vibeActions'
import { Skybox } from './Skybox'
import { GridFloor } from './GridFloor'
import { ParticleField } from './ParticleField'
import { Platform } from './Platform'
import { RelationshipBeam } from './RelationshipBeam'
import { AppPortal } from './AppPortal'
import { BreadcrumbTrail } from './BreadcrumbTrail'
import { AgentAvatar } from './AgentAvatar'
import { MaterializationEffect } from './MaterializationEffect'

export function World() {
  const {
    tables, relationships,
    setTables, addTables, setRelationships, addRelationships,
    setLoading, setLoaded,
    setIsSyncing, setSyncProgress, setSyncCounts,
  } = useAppStore()
  const apps = useAppStore((s) => s.apps)
  const setApps = useAppStore((s) => s.setApps)
  const visibleDomains = useAppStore((s) => s.visibleDomains)
  const hiddenTableIds = useAppStore((s) => s.hiddenTableIds)
  const activeAppFilter = useAppStore((s) => s.activeAppFilter)
  const [vibeState, setVibeState] = useState<VibeCreationState>({ phase: 'idle', appName: '', progress: 0, targetPosition: [0, 0, 0] })

  // Filter visible tables
  const visibleTables = useMemo(() => {
    let result = tables.filter((t) => visibleDomains.has(t.domain) && !hiddenTableIds.has(t.id))
    if (activeAppFilter) {
      const app = apps.find((a) => a.id === activeAppFilter)
      if (app) {
        const associated = new Set(app.associatedTables)
        result = result.filter((t) => associated.has(t.id))
      }
    }
    return result
  }, [tables, visibleDomains, hiddenTableIds, activeAppFilter, apps])

  // Filter visible relationships (both endpoints must be visible)
  const visibleRelationships = useMemo(() => {
    const visibleIds = new Set(visibleTables.map((t) => t.id))
    return relationships.filter(
      (r) => visibleIds.has(r.sourceTableId) && visibleIds.has(r.targetTableId),
    )
  }, [relationships, visibleTables])

  // Background discovery
  const startDiscovery = useCallback(async () => {
    if (getConfig().useMock) return

    const store = useAppStore.getState()
    const existingNames = new Set(store.tables.map((t) => t.id))

    setIsSyncing(true)
    setSyncProgress(0, 'Starting table discovery...')

    const allDiscovered: import('@/data/metadata').TableMetadata[] = []

    await discoverAllTables(
      existingNames,
      (batchMeta) => {
        const currentTables = useAppStore.getState().tables
        const newNodes = positionNewTables(batchMeta, currentTables)
        if (newNodes.length > 0) {
          addTables(newNodes)
        }
        allDiscovered.push(...batchMeta)
      },
      (loaded, total, phase) => {
        setSyncProgress(loaded, phase)
        setSyncCounts(loaded, total)
      },
    )

    setIsSyncing(false)

    // Save all discovered tables to cache
    if (allDiscovered.length > 0) {
      saveCachedTables(allDiscovered).catch(() => {})
    }

    // Update session cache so next refresh includes discovered tables
    const snap = useAppStore.getState()
    saveSessionCache(snap.tables, snap.relationships, snap.apps)
  }, [addTables, setIsSyncing, setSyncProgress, setSyncCounts])

  // Background record count refresh via bridge
  const refreshBridgeCounts = useCallback(async () => {
    // Wait for discovery to finish so we count all tables
    await new Promise<void>((resolve) => {
      const check = () => {
        if (!useAppStore.getState().isSyncing) return resolve()
        setTimeout(check, 2000)
      }
      check()
    })

    // Use current store tables (includes dynamically discovered ones)
    const currentTables = useAppStore.getState().tables
    if (currentTables.length === 0) return

    const tablesToCount = currentTables.map((t) => ({
      logicalName: t.id,
      entitySetName: t.entitySetName,
      primaryIdAttribute: t.primaryIdAttribute,
    }))

    console.log(`[World] Starting background count refresh for ${tablesToCount.length} tables...`)

    // Show counting phase in the sync progress bar
    setIsSyncing(true)
    setSyncProgress(0, 'Counting records...')
    setSyncCounts(0, tablesToCount.length)

    const counts = await refreshRecordCountsViaBridge(
      tablesToCount,
      (loaded, total) => {
        setSyncCounts(loaded, total)
        setSyncProgress(loaded, `Counting records... (${loaded}/${total})`)
        if (loaded % 10 === 0 || loaded === total) {
          console.log(`[World] Record counts: ${loaded}/${total}`)
        }
      },
    )

    if (counts.size > 0) {
      console.log(`[World] Got real counts for ${counts.size} tables`)
      useAppStore.getState().updateTableCounts(counts)
      // Persist to shared cache
      updateCachedRecordCounts(counts).catch(() => {})
    }

    setSyncProgress(tablesToCount.length, `Complete — ${counts.size} tables with record counts`)
    setIsSyncing(false)

    // Update session cache with latest counts for instant refresh
    const store = useAppStore.getState()
    saveSessionCache(store.tables, store.relationships, store.apps)
  }, [setIsSyncing, setSyncProgress, setSyncCounts])

  // Expose startDiscovery globally for the agent
  useEffect(() => {
    (window as any).__dveSyncTables = startDiscovery
    return () => { delete (window as any).__dveSyncTables }
  }, [startDiscovery])

  // Load data with cinematic loading sequence
  useEffect(() => {
    const loadSequence = async () => {
      setLoading(10, 'Connecting to Dataverse...')

      // ── Fast path: check sessionStorage first (survives soft refresh) ──
      const sessionCache = loadSessionCache()
      if (sessionCache) {
        console.log(`[World] Instant load from session cache (${sessionCache.tables.length} tables, ${sessionCache.relationships.length} rels)`)
        setLoading(80, 'Restoring from session...')
        setTables(sessionCache.tables)
        setRelationships(sessionCache.relationships)
        if (sessionCache.apps.length > 0) setApps(sessionCache.apps)

        // Load org URL in background
        loadOrgUrl().then((orgUrl) => {
          if (orgUrl) {
            configureDataverse({ orgUrl })
            useAppStore.getState().setOrgUrl(orgUrl)
          }
        })

        setLoading(100, 'Ready')
        await sleep(200)
        setLoaded(true)
        console.log('[World] Session cache hit — skipping all network calls')
        return
      }

      // ── Normal path: Dataverse cache or fresh fetch ──
      await sleep(500)
      setLoading(15, 'Checking cache...')
      const cachedMeta = await loadCachedTables()

      // Load org-wide org URL (entered once, shared across all users)
      const orgUrl = await loadOrgUrl()
      if (orgUrl) {
        configureDataverse({ orgUrl })
        useAppStore.getState().setOrgUrl(orgUrl)
        console.log('[World] Org URL loaded from shared config:', orgUrl)
      }

      let tableMeta
      let usedCache = false

      if (cachedMeta.length > 0) {
        console.log(`[World] Using ${cachedMeta.length} cached tables for instant display`)
        tableMeta = cachedMeta
        usedCache = true
        setLoading(40, 'Loaded from cache!')
      } else {
        setLoading(20, 'Fetching table metadata...')
        tableMeta = await fetchTableMetadata()
        await sleep(300)
      }

      setLoading(40, 'Mapping relationships...')
      const relMeta = await fetchRelationshipMetadata()
      await sleep(300)

      setLoading(55, 'Classifying CDM domains...')
      await sleep(400)

      setLoading(70, 'Computing city grid layout...')
      const sceneGraph = buildSceneGraph(tableMeta, relMeta)
      await sleep(300)

      setTables(sceneGraph.tables)
      setRelationships(sceneGraph.relationships)

      setLoading(85, 'Discovering applications...')
      const appMeta = await fetchAppMetadata()
      setApps(appMeta)
      await sleep(300)

      setLoading(95, 'Rendering 3D world...')
      await sleep(400)

      setLoading(100, 'Ready')
      await sleep(200)
      setLoaded(true)

      // Save to sessionStorage for instant refresh
      saveSessionCache(sceneGraph.tables, sceneGraph.relationships, appMeta)

      if (usedCache) {
        // Cache hit — skip heavy discovery and counting on this load
        console.log('[World] Loaded from cache — skipping discovery and count refresh')
      } else {
        // First load — discover additional tables and count records
        startDiscovery()

        // Save the freshly fetched metadata to cache for next time
        if (!getConfig().useMock) {
          saveCachedTables(tableMeta).catch(() => {})
        }

        // Background: refresh record counts via bridge and update cache
        if (!getConfig().useMock) {
          refreshBridgeCounts()
        }
      }
    }

    loadSequence()
  }, [setTables, setRelationships, setLoading, setLoaded, setApps, startDiscovery])

  // Build lookup for relationship rendering
  const tableMap = useMemo(() => {
    const map = new Map<string, TableNode>()
    for (const t of tables) map.set(t.id, t)
    return map
  }, [tables])

  // Domain label positions — computed from actual table counts
  const domainLabels = useMemo(() => {
    const counts = new Map<string, number>()
    for (const t of tables) {
      counts.set(t.domain, (counts.get(t.domain) ?? 0) + 1)
    }
    return CDM_DOMAINS
      .filter((d) => (counts.get(d) ?? 0) > 0)
      .map((domain) => ({
        domain,
        position: getDomainBlockCenter(domain, counts.get(domain) ?? 0),
        count: counts.get(domain) ?? 0,
      }))
  }, [tables])

  return (
    <>
      <Skybox />
      <GridFloor />
      <ParticleField />

      {/* Domain block labels */}
      {domainLabels.map(({ domain, position, count }) => (
        <Text
          key={domain}
          position={position}
          fontSize={1.0}
          color={getDomainColors(domain).accent}
          anchorX="center"
          anchorY="middle"
          outlineWidth={0.02}
          outlineColor="#000000"
          fillOpacity={visibleDomains.has(domain) ? 0.5 : 0.15}
        >
          {`${domain.toUpperCase()} (${count})`}
        </Text>
      ))}

      {/* Table Platforms — only visible ones */}
      {visibleTables.map((table) => (
        <Platform
          key={table.id}
          id={table.id}
          name={table.displayName}
          domain={table.domain}
          position={table.position}
          recordCount={table.recordCount}
          columns={table.columns}
        />
      ))}

      {/* Relationship Beams — only between visible tables */}
      {visibleRelationships.map((rel) => {
        const source = tableMap.get(rel.sourceTableId)
        const target = tableMap.get(rel.targetTableId)
        if (!source || !target) return null

        return (
          <RelationshipBeam
            key={rel.id}
            sourcePosition={source.position}
            targetPosition={target.position}
            sourceDomain={source.domain}
            type={rel.type}
            sourceTableId={rel.sourceTableId}
            targetTableId={rel.targetTableId}
          />
        )
      })}

      {/* App Portals */}
      {apps.map((app, i) => (
        <AppPortal
          key={app.id}
          app={app}
          index={i}
          tableMap={tableMap}
        />
      ))}

      {/* Breadcrumb Trail */}
      <BreadcrumbTrail />

      {/* AI Agent Avatar */}
      <AgentAvatar />

      {/* Vibe Coding Materialization */}
      <MaterializationEffect state={vibeState} />

      {/* Ambient light */}
      <ambientLight intensity={0.15} />
    </>
  )
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

// ── Session cache: instant reload on soft refresh ──
const SESSION_CACHE_KEY = 'dve_session_cache'

interface SessionCache {
  tables: TableNode[]
  relationships: import('@/store/appStore').RelationshipEdge[]
  apps: import('@/data/metadata').AppMetadata[]
  timestamp: number
}

function saveSessionCache(
  tables: TableNode[],
  relationships: import('@/store/appStore').RelationshipEdge[],
  apps: import('@/data/metadata').AppMetadata[],
) {
  try {
    const cache: SessionCache = { tables, relationships, apps, timestamp: Date.now() }
    sessionStorage.setItem(SESSION_CACHE_KEY, JSON.stringify(cache))
    console.log(`[SessionCache] Saved ${tables.length} tables, ${relationships.length} rels`)
  } catch { /* quota exceeded or unavailable */ }
}

function loadSessionCache(): SessionCache | null {
  try {
    const raw = sessionStorage.getItem(SESSION_CACHE_KEY)
    if (!raw) return null
    const cache: SessionCache = JSON.parse(raw)
    // Validate basic shape
    if (!Array.isArray(cache.tables) || cache.tables.length === 0) return null
    console.log(`[SessionCache] Found ${cache.tables.length} tables (saved ${Math.round((Date.now() - cache.timestamp) / 1000)}s ago)`)
    return cache
  } catch {
    return null
  }
}
