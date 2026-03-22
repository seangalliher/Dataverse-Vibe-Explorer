import { describe, it, expect, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useAppStore } from '@/store/appStore'

// Mock formatRecordCount since it depends on module-level state
vi.mock('@/data/dataverse', () => ({
  formatRecordCount: (count: number) => count.toLocaleString(),
  getConfig: () => ({ useMock: true, orgUrl: '', environmentId: '' }),
  configureDataverse: vi.fn(),
  getWebApiStatus: () => 'untested',
  getBridgeCountStatus: () => 'untested',
  getCurrentUser: () => null,
  getDataClient: () => null,
  initializeDataverse: vi.fn().mockResolvedValue(undefined),
}))

// We need to mock getDomainColors since it depends on THREE.Color
vi.mock('@/utils/colors', () => ({
  CDM_DOMAINS: ['Core', 'Sales', 'Service', 'Marketing', 'Finance', 'Custom'],
  getDomainColors: (domain: string) => ({
    primary: '#00f0ff',
    glow: '#00f0ff40',
    accent: '#80ffff',
    three: {},
    threeGlow: {},
  }),
  BACKGROUND_COLOR: '#050510',
  GRID_COLOR: '#00f0ff',
  TEXT_COLOR: '#e2e8f0',
}))

const mockTable = {
  id: 'account',
  name: 'account',
  displayName: 'Account',
  domain: 'Core' as const,
  recordCount: 2450,
  position: [0, 1, 0] as [number, number, number],
  columns: [
    { name: 'name', displayName: 'Account Name', dataType: 'string', isRequired: true },
    { name: 'revenue', displayName: 'Revenue', dataType: 'currency', isRequired: false },
  ],
  relationships: ['contact'],
  entitySetName: 'accounts',
  primaryNameAttribute: 'name',
  primaryIdAttribute: 'accountid',
}

describe('HoverTooltip', () => {
  beforeEach(() => {
    useAppStore.setState({
      tables: [mockTable],
      hoveredTableId: null,
    })
  })

  it('renders nothing when no table is hovered', async () => {
    const { HoverTooltip } = await import('@/ui/HoverTooltip')
    const { container } = render(<HoverTooltip />)
    expect(container.firstChild).toBeNull()
  })

  it('renders tooltip when table is hovered', async () => {
    useAppStore.setState({ hoveredTableId: 'account' })
    const { HoverTooltip } = await import('@/ui/HoverTooltip')
    render(<HoverTooltip />)
    expect(screen.getByText('Account')).toBeInTheDocument()
  })

  it('shows domain, record count', async () => {
    useAppStore.setState({ hoveredTableId: 'account' })
    const { HoverTooltip } = await import('@/ui/HoverTooltip')
    render(<HoverTooltip />)
    // The tooltip text includes domain, record count
    const tooltip = screen.getByText(/Core/i)
    expect(tooltip).toBeInTheDocument()
  })
})

describe('HudOverlay', () => {
  beforeEach(() => {
    useAppStore.setState({
      tables: [mockTable],
      selectedTableId: null,
      loaded: true,
    })
  })

  it('renders nothing when not loaded', async () => {
    useAppStore.setState({ loaded: false })
    const { HudOverlay } = await import('@/ui/HudOverlay')
    const { container } = render(<HudOverlay />)
    expect(container.firstChild).toBeNull()
  })

  it('shows keyboard controls when loaded', async () => {
    const { HudOverlay } = await import('@/ui/HudOverlay')
    render(<HudOverlay />)
    expect(screen.getByText('WASD')).toBeInTheDocument()
    expect(screen.getByText('RMB')).toBeInTheDocument()
    expect(screen.getByText('Shift')).toBeInTheDocument()
  })

  it('shows data inspection panel when table selected', async () => {
    useAppStore.setState({ selectedTableId: 'account' })
    const { HudOverlay } = await import('@/ui/HudOverlay')
    render(<HudOverlay />)
    expect(screen.getByText('Account')).toBeInTheDocument()
    expect(screen.getByText('Account Name')).toBeInTheDocument()
    expect(screen.getByText('Revenue')).toBeInTheDocument()
  })

  it('shows record count and domain stats', async () => {
    useAppStore.setState({ selectedTableId: 'account' })
    const { HudOverlay } = await import('@/ui/HudOverlay')
    render(<HudOverlay />)
    expect(screen.getByText('2,450')).toBeInTheDocument()
    expect(screen.getByText('Core')).toBeInTheDocument()
  })

  it('close button deselects table', async () => {
    useAppStore.setState({ selectedTableId: 'account', hudVisible: true })
    const { HudOverlay } = await import('@/ui/HudOverlay')
    render(<HudOverlay />)
    const closeBtn = screen.getByText('✕')
    await userEvent.click(closeBtn)
    expect(useAppStore.getState().selectedTableId).toBeNull()
  })

  it('shows data type badges for columns', async () => {
    useAppStore.setState({ selectedTableId: 'account' })
    const { HudOverlay } = await import('@/ui/HudOverlay')
    render(<HudOverlay />)
    expect(screen.getByText('string')).toBeInTheDocument()
    expect(screen.getByText('currency')).toBeInTheDocument()
  })
})

describe('Minimap', () => {
  beforeEach(() => {
    useAppStore.setState({
      tables: [
        mockTable,
        { id: 'contact', name: 'contact', displayName: 'Contact', domain: 'Core' as const, recordCount: 8920, position: [6, 1, 0] as [number, number, number], columns: [], relationships: [], entitySetName: 'contacts', primaryNameAttribute: 'fullname' },
      ],
      minimapOpen: true,
      selectedTableId: null,
    })
  })

  it('renders the minimap when open', async () => {
    const { Minimap } = await import('@/ui/Minimap')
    render(<Minimap />)
    expect(screen.getByText('Dataverse Map')).toBeInTheDocument()
  })

  it('renders SVG dots for each table', async () => {
    const { Minimap } = await import('@/ui/Minimap')
    const { container } = render(<Minimap />)
    // Each table gets a <g> group with circles
    const groups = container.querySelectorAll('g')
    expect(groups.length).toBeGreaterThanOrEqual(2)
  })

  it('shows MAP button when closed', async () => {
    useAppStore.setState({ minimapOpen: false })
    const { Minimap } = await import('@/ui/Minimap')
    render(<Minimap />)
    expect(screen.getByText('MAP')).toBeInTheDocument()
  })

  it('MAP button opens minimap', async () => {
    useAppStore.setState({ minimapOpen: false })
    const { Minimap } = await import('@/ui/Minimap')
    render(<Minimap />)
    await userEvent.click(screen.getByText('MAP'))
    expect(useAppStore.getState().minimapOpen).toBe(true)
  })

  it('close button hides minimap', async () => {
    const { Minimap } = await import('@/ui/Minimap')
    render(<Minimap />)
    const closeBtn = screen.getByText('✕')
    await userEvent.click(closeBtn)
    expect(useAppStore.getState().minimapOpen).toBe(false)
  })
})

describe('LoadingScreen', () => {
  beforeEach(() => {
    useAppStore.setState({
      loaded: false,
      loadingProgress: 0,
      loadingPhase: 'Initializing...',
    })
  })

  it('shows title during loading', async () => {
    const { LoadingScreen } = await import('@/ui/LoadingScreen')
    render(<LoadingScreen />)
    expect(screen.getByText('DATAVERSE VIBE EXPLORER')).toBeInTheDocument()
  })

  it('shows loading phase text', async () => {
    useAppStore.setState({ loadingPhase: 'Fetching table metadata...' })
    const { LoadingScreen } = await import('@/ui/LoadingScreen')
    render(<LoadingScreen />)
    expect(screen.getByText('Fetching table metadata...')).toBeInTheDocument()
  })
})

describe('SyncProgressBar', () => {
  beforeEach(() => {
    useAppStore.setState({
      isSyncing: false,
      syncProgress: 0,
      syncPhase: '',
      syncLoaded: 0,
      syncTotal: 0,
      tables: [],
    })
  })

  it('renders nothing when not syncing and no phase', async () => {
    const mod = await import('@/ui/SyncProgressBar')
    const SyncProgressBar = mod.default
    const { container } = render(<SyncProgressBar />)
    expect(container.firstChild).toBeNull()
  })

  it('shows sync progress when syncing', async () => {
    useAppStore.setState({
      isSyncing: true,
      syncPhase: 'Discovering tables...',
      syncLoaded: 25,
      syncTotal: 65,
      tables: [mockTable],
    })
    const mod = await import('@/ui/SyncProgressBar')
    const SyncProgressBar = mod.default
    render(<SyncProgressBar />)
    expect(screen.getAllByText(/Discovering tables/).length).toBeGreaterThan(0)
  })

  it('shows completion message when done', async () => {
    useAppStore.setState({
      isSyncing: false,
      syncPhase: 'Discovery complete — 65 additional tables found',
      tables: Array.from({ length: 82 }, (_, i) => ({
        ...mockTable,
        id: `table-${i}`,
      })),
    })
    const mod = await import('@/ui/SyncProgressBar')
    const SyncProgressBar = mod.default
    render(<SyncProgressBar />)
    expect(screen.getByText(/complete.*82 tables loaded/i)).toBeInTheDocument()
  })
})
