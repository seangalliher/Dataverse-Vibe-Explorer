import { describe, it, expect, beforeEach } from 'vitest'
import { useAppStore } from '@/store/appStore'
import { CDM_DOMAINS } from '@/utils/colors'

describe('appStore', () => {
  beforeEach(() => {
    // Reset store to initial state
    useAppStore.setState({
      tables: [],
      relationships: [],
      apps: [],
      selectedTableId: null,
      hoveredTableId: null,
      cameraMode: 'fly',
      flyToTarget: null,
      searchOpen: false,
      hudVisible: false,
      minimapOpen: true,
      loadingProgress: 0,
      loadingPhase: 'Initializing...',
      loaded: false,
      chatOpen: false,
      chatMessages: [],
      agentThinking: false,
      visitedPositions: [],
      orgUrl: '',
      isSyncing: false,
      syncProgress: 0,
      syncPhase: '',
      syncTotal: 0,
      syncLoaded: 0,
      visibleDomains: new Set(CDM_DOMAINS),
      hiddenTableIds: new Set(),
      preferencesLoaded: false,
      userPreferences: null,
      recordPreview: null,
    })
  })

  describe('tables', () => {
    const makeNode = (id: string, overrides?: Partial<import('@/store/appStore').TableNode>): import('@/store/appStore').TableNode => ({
      id, name: id, displayName: id.toUpperCase(), domain: 'Core' as const,
      recordCount: 0, position: [0, 0, 0], columns: [], relationships: [],
      entitySetName: `${id}s`, primaryNameAttribute: 'name', primaryIdAttribute: `${id}id`,
      ...overrides,
    })

    it('setTables replaces all tables', () => {
      const tables = [makeNode('a', { recordCount: 1 })]
      useAppStore.getState().setTables(tables)
      expect(useAppStore.getState().tables).toEqual(tables)
    })

    it('addTables appends unique tables', () => {
      const t1 = makeNode('a', { recordCount: 1 })
      const t2 = makeNode('b', { domain: 'Sales' as const, recordCount: 2, position: [1, 0, 0] })
      useAppStore.getState().setTables([t1])
      useAppStore.getState().addTables([t1, t2]) // t1 is duplicate
      expect(useAppStore.getState().tables).toHaveLength(2)
    })

    it('addTables does not modify state when all duplicates', () => {
      const t1 = makeNode('a', { recordCount: 1 })
      useAppStore.getState().setTables([t1])
      const before = useAppStore.getState().tables
      useAppStore.getState().addTables([t1])
      expect(useAppStore.getState().tables).toBe(before) // same reference
    })
  })

  describe('relationships', () => {
    it('setRelationships replaces all', () => {
      const rels = [{ id: 'r1', sourceTableId: 'a', targetTableId: 'b', type: 'one-to-many' as const }]
      useAppStore.getState().setRelationships(rels)
      expect(useAppStore.getState().relationships).toEqual(rels)
    })

    it('addRelationships appends unique', () => {
      const r1 = { id: 'r1', sourceTableId: 'a', targetTableId: 'b', type: 'one-to-many' as const }
      const r2 = { id: 'r2', sourceTableId: 'b', targetTableId: 'c', type: 'one-to-many' as const }
      useAppStore.getState().setRelationships([r1])
      useAppStore.getState().addRelationships([r1, r2])
      expect(useAppStore.getState().relationships).toHaveLength(2)
    })
  })

  describe('selection', () => {
    it('setSelectedTable sets selectedTableId and shows HUD', () => {
      useAppStore.getState().setSelectedTable('account')
      expect(useAppStore.getState().selectedTableId).toBe('account')
      expect(useAppStore.getState().hudVisible).toBe(true)
    })

    it('setSelectedTable(null) hides HUD', () => {
      useAppStore.getState().setSelectedTable(null)
      expect(useAppStore.getState().selectedTableId).toBeNull()
      expect(useAppStore.getState().hudVisible).toBe(false)
    })

    it('setHoveredTable updates hoveredTableId', () => {
      useAppStore.getState().setHoveredTable('contact')
      expect(useAppStore.getState().hoveredTableId).toBe('contact')
    })
  })

  describe('camera', () => {
    it('setCameraMode updates mode', () => {
      useAppStore.getState().setCameraMode('orbit')
      expect(useAppStore.getState().cameraMode).toBe('orbit')
    })

    it('setFlyToTarget sets target and transition mode', () => {
      const target = { position: [0, 10, 20] as [number, number, number], lookAt: [0, 0, 0] as [number, number, number] }
      useAppStore.getState().setFlyToTarget(target)
      expect(useAppStore.getState().flyToTarget).toEqual(target)
      expect(useAppStore.getState().cameraMode).toBe('transition')
    })

    it('setFlyToTarget(null) returns to fly mode', () => {
      useAppStore.getState().setFlyToTarget(null)
      expect(useAppStore.getState().flyToTarget).toBeNull()
      expect(useAppStore.getState().cameraMode).toBe('fly')
    })
  })

  describe('visibility', () => {
    it('toggleTableVisibility adds and removes IDs', () => {
      useAppStore.getState().toggleTableVisibility('account')
      expect(useAppStore.getState().hiddenTableIds.has('account')).toBe(true)
      useAppStore.getState().toggleTableVisibility('account')
      expect(useAppStore.getState().hiddenTableIds.has('account')).toBe(false)
    })

    it('setVisibleDomains updates domain filter', () => {
      const newDomains = new Set(['Core', 'Sales'] as const)
      useAppStore.getState().setVisibleDomains(newDomains as any)
      expect(useAppStore.getState().visibleDomains.size).toBe(2)
    })

    it('showAllTables clears hidden IDs and restores domains', () => {
      useAppStore.getState().toggleTableVisibility('account')
      useAppStore.getState().setVisibleDomains(new Set(['Core']) as any)
      useAppStore.getState().showAllTables()
      expect(useAppStore.getState().hiddenTableIds.size).toBe(0)
      expect(useAppStore.getState().visibleDomains.size).toBe(6) // all CDM_DOMAINS
    })
  })

  describe('UI state', () => {
    it('setSearchOpen toggles search', () => {
      useAppStore.getState().setSearchOpen(true)
      expect(useAppStore.getState().searchOpen).toBe(true)
    })

    it('setMinimapOpen toggles minimap', () => {
      useAppStore.getState().setMinimapOpen(false)
      expect(useAppStore.getState().minimapOpen).toBe(false)
    })

    it('setLoading updates progress and phase', () => {
      useAppStore.getState().setLoading(50, 'Loading tables...')
      expect(useAppStore.getState().loadingProgress).toBe(50)
      expect(useAppStore.getState().loadingPhase).toBe('Loading tables...')
    })

    it('setLoaded marks app as loaded', () => {
      useAppStore.getState().setLoaded(true)
      expect(useAppStore.getState().loaded).toBe(true)
    })
  })

  describe('chat', () => {
    it('setChatOpen toggles chat panel', () => {
      useAppStore.getState().setChatOpen(true)
      expect(useAppStore.getState().chatOpen).toBe(true)
    })

    it('addChatMessage appends messages', () => {
      const msg = { id: '1', role: 'user' as const, content: 'hello', timestamp: Date.now() }
      useAppStore.getState().addChatMessage(msg)
      expect(useAppStore.getState().chatMessages).toHaveLength(1)
      expect(useAppStore.getState().chatMessages[0].content).toBe('hello')
    })

    it('setAgentThinking updates thinking state', () => {
      useAppStore.getState().setAgentThinking(true)
      expect(useAppStore.getState().agentThinking).toBe(true)
    })
  })

  describe('navigation history', () => {
    it('addVisited appends to history', () => {
      useAppStore.getState().addVisited('account', [0, 0, 0])
      expect(useAppStore.getState().visitedPositions).toHaveLength(1)
    })

    it('addVisited keeps only last 10 positions', () => {
      for (let i = 0; i < 15; i++) {
        useAppStore.getState().addVisited(`table-${i}`, [i, 0, 0])
      }
      expect(useAppStore.getState().visitedPositions).toHaveLength(10)
      // Most recent should be last
      expect(useAppStore.getState().visitedPositions[9].tableId).toBe('table-14')
    })
  })

  describe('org URL', () => {
    it('setOrgUrl updates URL', () => {
      useAppStore.getState().setOrgUrl('https://org.crm.dynamics.com')
      expect(useAppStore.getState().orgUrl).toBe('https://org.crm.dynamics.com')
    })
  })

  describe('updateTableCounts', () => {
    it('updates record counts by table id', () => {
      const t1 = { id: 'account', name: 'account', displayName: 'Account', domain: 'Core' as const, recordCount: 0, position: [0, 0, 0] as [number, number, number], columns: [], relationships: [], entitySetName: 'accounts', primaryNameAttribute: 'name', primaryIdAttribute: 'accountid' }
      useAppStore.getState().setTables([t1])
      const counts = new Map([['account', 5000]])
      useAppStore.getState().updateTableCounts(counts)
      expect(useAppStore.getState().tables[0].recordCount).toBe(5000)
    })

    it('leaves unmatched tables unchanged', () => {
      const t1 = { id: 'account', name: 'account', displayName: 'Account', domain: 'Core' as const, recordCount: 100, position: [0, 0, 0] as [number, number, number], columns: [], relationships: [], entitySetName: 'accounts', primaryNameAttribute: 'name', primaryIdAttribute: 'accountid' }
      useAppStore.getState().setTables([t1])
      const counts = new Map([['contact', 999]])
      useAppStore.getState().updateTableCounts(counts)
      expect(useAppStore.getState().tables[0].recordCount).toBe(100)
    })
  })

  describe('updateSingleTableCount', () => {
    it('updates a single table count', () => {
      const t1 = { id: 'account', name: 'account', displayName: 'Account', domain: 'Core' as const, recordCount: 0, position: [0, 0, 0] as [number, number, number], columns: [], relationships: [], entitySetName: 'accounts', primaryNameAttribute: 'name', primaryIdAttribute: 'accountid' }
      useAppStore.getState().setTables([t1])
      useAppStore.getState().updateSingleTableCount('account', 42)
      expect(useAppStore.getState().tables[0].recordCount).toBe(42)
    })
  })

  describe('recordPreview', () => {
    it('setRecordPreview sets and clears preview', () => {
      const preview = { tableId: 'account', records: [{ name: 'test' }], loading: false }
      useAppStore.getState().setRecordPreview(preview)
      expect(useAppStore.getState().recordPreview).toEqual(preview)
      useAppStore.getState().setRecordPreview(null)
      expect(useAppStore.getState().recordPreview).toBeNull()
    })

    it('setSelectedTable clears recordPreview', () => {
      useAppStore.getState().setRecordPreview({ tableId: 'account', records: [], loading: false })
      useAppStore.getState().setSelectedTable('contact')
      expect(useAppStore.getState().recordPreview).toBeNull()
    })
  })

  describe('sync state', () => {
    it('setIsSyncing toggles syncing flag', () => {
      useAppStore.getState().setIsSyncing(true)
      expect(useAppStore.getState().isSyncing).toBe(true)
    })

    it('setSyncProgress updates progress and phase', () => {
      useAppStore.getState().setSyncProgress(50, 'Discovering...')
      expect(useAppStore.getState().syncProgress).toBe(50)
      expect(useAppStore.getState().syncPhase).toBe('Discovering...')
    })

    it('setSyncCounts updates loaded and total', () => {
      useAppStore.getState().setSyncCounts(25, 100)
      expect(useAppStore.getState().syncLoaded).toBe(25)
      expect(useAppStore.getState().syncTotal).toBe(100)
    })
  })

  describe('preferences', () => {
    it('setUserPreferences stores prefs and marks loaded', () => {
      const prefs = { orgUrl: '', hiddenDomains: [], hiddenTableIds: [], highContrast: false, reducedMotion: false, extra: {} }
      useAppStore.getState().setUserPreferences(prefs)
      expect(useAppStore.getState().preferencesLoaded).toBe(true)
      expect(useAppStore.getState().userPreferences).toEqual(prefs)
    })

    it('applyPreferences sets org URL when not already set', () => {
      const prefs = { orgUrl: 'https://example.crm.dynamics.com', hiddenDomains: [], hiddenTableIds: [], highContrast: false, reducedMotion: false, extra: {} }
      useAppStore.getState().applyPreferences(prefs)
      expect(useAppStore.getState().orgUrl).toBe('https://example.crm.dynamics.com')
    })

    it('applyPreferences does not overwrite existing org URL', () => {
      useAppStore.getState().setOrgUrl('https://existing.crm.dynamics.com')
      const prefs = { orgUrl: 'https://new.crm.dynamics.com', hiddenDomains: [], hiddenTableIds: [], highContrast: false, reducedMotion: false, extra: {} }
      useAppStore.getState().applyPreferences(prefs)
      expect(useAppStore.getState().orgUrl).toBe('https://existing.crm.dynamics.com')
    })

    it('applyPreferences applies hidden domains', () => {
      const prefs = { orgUrl: '', hiddenDomains: ['Marketing', 'Custom'], hiddenTableIds: [], highContrast: false, reducedMotion: false, extra: {} }
      useAppStore.getState().applyPreferences(prefs)
      expect(useAppStore.getState().visibleDomains.has('Marketing' as any)).toBe(false)
      expect(useAppStore.getState().visibleDomains.has('Custom' as any)).toBe(false)
      expect(useAppStore.getState().visibleDomains.has('Core' as any)).toBe(true)
    })

    it('applyPreferences applies hidden table IDs', () => {
      const prefs = { orgUrl: '', hiddenDomains: [], hiddenTableIds: ['account', 'contact'], highContrast: false, reducedMotion: false, extra: {} }
      useAppStore.getState().applyPreferences(prefs)
      expect(useAppStore.getState().hiddenTableIds.has('account')).toBe(true)
      expect(useAppStore.getState().hiddenTableIds.has('contact')).toBe(true)
    })
  })
})
