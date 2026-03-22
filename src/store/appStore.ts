import { create } from 'zustand'
import { CDM_DOMAINS, type CDMDomain } from '@/utils/colors'
import type { AppMetadata } from '@/data/metadata'
import type { UserPreferences } from '@/data/cacheService'

export interface TableNode {
  id: string
  name: string
  displayName: string
  domain: CDMDomain
  recordCount: number
  position: [number, number, number]
  columns: ColumnInfo[]
  relationships: string[]
  entitySetName: string
  primaryNameAttribute: string
  primaryIdAttribute: string
}

export interface RecordPreview {
  tableId: string
  records: Record<string, unknown>[]
  loading: boolean
}

export interface ColumnInfo {
  name: string
  displayName: string
  dataType: string
  isRequired: boolean
}

export interface RelationshipEdge {
  id: string
  sourceTableId: string
  targetTableId: string
  type: 'one-to-many' | 'many-to-many'
}

export type CameraMode = 'fly' | 'orbit' | 'transition'

export interface ChatMessage {
  id: string
  role: 'user' | 'agent'
  content: string
  timestamp: number
}

interface AppState {
  // Scene
  tables: TableNode[]
  relationships: RelationshipEdge[]
  apps: AppMetadata[]
  setTables: (tables: TableNode[]) => void
  addTables: (tables: TableNode[]) => void
  setRelationships: (rels: RelationshipEdge[]) => void
  addRelationships: (rels: RelationshipEdge[]) => void
  setApps: (apps: AppMetadata[]) => void

  // Sync
  isSyncing: boolean
  setIsSyncing: (syncing: boolean) => void
  syncProgress: number
  syncPhase: string
  setSyncProgress: (progress: number, phase: string) => void
  syncTotal: number
  syncLoaded: number
  setSyncCounts: (loaded: number, total: number) => void

  // Visibility filters
  visibleDomains: Set<CDMDomain>
  setVisibleDomains: (domains: Set<CDMDomain>) => void
  hiddenTableIds: Set<string>
  toggleTableVisibility: (id: string) => void
  showAllTables: () => void

  // Selection
  selectedTableId: string | null
  hoveredTableId: string | null
  setSelectedTable: (id: string | null) => void
  setHoveredTable: (id: string | null) => void

  // Camera
  cameraMode: CameraMode
  setCameraMode: (mode: CameraMode) => void
  flyToTarget: { position: [number, number, number]; lookAt: [number, number, number] } | null
  setFlyToTarget: (target: { position: [number, number, number]; lookAt: [number, number, number] } | null) => void

  // UI
  searchOpen: boolean
  setSearchOpen: (open: boolean) => void
  hudVisible: boolean
  setHudVisible: (visible: boolean) => void
  minimapOpen: boolean
  setMinimapOpen: (open: boolean) => void
  loadingProgress: number
  loadingPhase: string
  setLoading: (progress: number, phase: string) => void
  loaded: boolean
  setLoaded: (loaded: boolean) => void

  // Agent / Chat
  chatOpen: boolean
  setChatOpen: (open: boolean) => void
  chatMessages: ChatMessage[]
  addChatMessage: (msg: ChatMessage) => void
  clearChatMessages: () => void
  agentThinking: boolean
  setAgentThinking: (thinking: boolean) => void

  // Navigation history
  visitedPositions: Array<{ tableId: string; position: [number, number, number] }>
  addVisited: (tableId: string, position: [number, number, number]) => void

  // Org URL for direct Web API
  orgUrl: string
  setOrgUrl: (url: string) => void
  updateTableCounts: (counts: Map<string, number>) => void
  updateSingleTableCount: (tableId: string, count: number) => void

  // Record preview (right-click)
  recordPreview: RecordPreview | null
  setRecordPreview: (preview: RecordPreview | null) => void

  // App filter — filters 3D scene to tables belonging to a specific app
  activeAppFilter: string | null
  setActiveAppFilter: (appId: string | null) => void

  // Persisted user preferences
  preferencesLoaded: boolean
  userPreferences: UserPreferences | null
  setUserPreferences: (prefs: UserPreferences) => void
  applyPreferences: (prefs: UserPreferences) => void
}

export const useAppStore = create<AppState>((set) => ({
  tables: [],
  relationships: [],
  apps: [],
  setTables: (tables) => set({ tables }),
  addTables: (newTables) =>
    set((state) => {
      const existing = new Set(state.tables.map((t) => t.id))
      const unique = newTables.filter((t) => !existing.has(t.id))
      return unique.length > 0 ? { tables: [...state.tables, ...unique] } : {}
    }),
  setRelationships: (rels) => set({ relationships: rels }),
  addRelationships: (newRels) =>
    set((state) => {
      const existing = new Set(state.relationships.map((r) => r.id))
      const unique = newRels.filter((r) => !existing.has(r.id))
      return unique.length > 0 ? { relationships: [...state.relationships, ...unique] } : {}
    }),
  setApps: (apps) => set({ apps }),

  isSyncing: false,
  setIsSyncing: (syncing) => set({ isSyncing: syncing }),
  syncProgress: 0,
  syncPhase: '',
  setSyncProgress: (progress, phase) => set({ syncProgress: progress, syncPhase: phase }),
  syncTotal: 0,
  syncLoaded: 0,
  setSyncCounts: (loaded, total) => set({ syncLoaded: loaded, syncTotal: total }),

  visibleDomains: new Set(CDM_DOMAINS),
  setVisibleDomains: (domains) => set({ visibleDomains: domains }),
  hiddenTableIds: new Set(),
  toggleTableVisibility: (id) =>
    set((state) => {
      const next = new Set(state.hiddenTableIds)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return { hiddenTableIds: next }
    }),
  showAllTables: () => set({ hiddenTableIds: new Set(), visibleDomains: new Set(CDM_DOMAINS) }),

  selectedTableId: null,
  hoveredTableId: null,
  setSelectedTable: (id) => set({ selectedTableId: id, hudVisible: id !== null, recordPreview: null }),
  setHoveredTable: (id) => set({ hoveredTableId: id }),

  cameraMode: 'fly',
  setCameraMode: (mode) => set({ cameraMode: mode }),
  flyToTarget: null,
  setFlyToTarget: (target) => set({ flyToTarget: target, cameraMode: target ? 'transition' : 'fly' }),

  searchOpen: false,
  setSearchOpen: (open) => set({ searchOpen: open }),
  hudVisible: false,
  setHudVisible: (visible) => set({ hudVisible: visible }),
  minimapOpen: true,
  setMinimapOpen: (open) => set({ minimapOpen: open }),
  loadingProgress: 0,
  loadingPhase: 'Initializing...',
  setLoading: (progress, phase) => set({ loadingProgress: progress, loadingPhase: phase }),
  loaded: false,
  setLoaded: (loaded) => set({ loaded }),

  chatOpen: false,
  setChatOpen: (open) => set({ chatOpen: open }),
  chatMessages: [],
  addChatMessage: (msg) =>
    set((state) => ({ chatMessages: [...state.chatMessages, msg] })),
  clearChatMessages: () => set({ chatMessages: [] }),
  agentThinking: false,
  setAgentThinking: (thinking) => set({ agentThinking: thinking }),

  visitedPositions: [],
  addVisited: (tableId, position) =>
    set((state) => ({
      visitedPositions: [...state.visitedPositions.slice(-9), { tableId, position }],
    })),

  orgUrl: '',
  setOrgUrl: (url) => set({ orgUrl: url }),
  updateTableCounts: (counts) =>
    set((state) => ({
      tables: state.tables.map((t) => {
        const newCount = counts.get(t.id)
        return newCount !== undefined ? { ...t, recordCount: newCount } : t
      }),
    })),
  updateSingleTableCount: (tableId, count) =>
    set((state) => ({
      tables: state.tables.map((t) =>
        t.id === tableId ? { ...t, recordCount: count } : t,
      ),
    })),

  recordPreview: null,
  setRecordPreview: (preview) => set({ recordPreview: preview }),

  activeAppFilter: null,
  setActiveAppFilter: (appId) => set({ activeAppFilter: appId }),

  preferencesLoaded: false,
  userPreferences: null,
  setUserPreferences: (prefs) => set({ userPreferences: prefs, preferencesLoaded: true }),
  applyPreferences: (prefs) =>
    set((state) => {
      const updates: Partial<AppState> = {
        userPreferences: prefs,
        preferencesLoaded: true,
      }
      // Apply org URL from per-user prefs only if no org-wide URL is already set
      if (prefs.orgUrl && !state.orgUrl) {
        updates.orgUrl = prefs.orgUrl
      }
      // Apply hidden domains
      if (prefs.hiddenDomains.length > 0) {
        const allDomains = new Set(CDM_DOMAINS)
        for (const d of prefs.hiddenDomains) allDomains.delete(d as CDMDomain)
        updates.visibleDomains = allDomains
      }
      // Apply hidden table IDs
      if (prefs.hiddenTableIds.length > 0) {
        updates.hiddenTableIds = new Set(prefs.hiddenTableIds)
      }
      return updates
    }),
}))
