import { describe, it, expect, beforeEach } from 'vitest'
import { parseCommand, executeCommand } from '@/agent/agentService'
import { useAppStore } from '@/store/appStore'

describe('parseCommand', () => {
  describe('navigate commands', () => {
    it('parses "show me accounts"', () => {
      expect(parseCommand('show me accounts')).toEqual({ type: 'navigate', target: 'accounts' })
    })

    it('parses "go to contacts"', () => {
      expect(parseCommand('go to contacts')).toEqual({ type: 'navigate', target: 'contacts' })
    })

    it('parses "navigate to opportunity"', () => {
      expect(parseCommand('navigate to opportunity')).toEqual({ type: 'navigate', target: 'opportunity' })
    })

    it('parses "find leads"', () => {
      expect(parseCommand('find leads')).toEqual({ type: 'navigate', target: 'leads' })
    })

    it('parses "take me to cases"', () => {
      expect(parseCommand('take me to cases')).toEqual({ type: 'navigate', target: 'cases' })
    })

    it('is case insensitive', () => {
      expect(parseCommand('SHOW ME Account')).toEqual({ type: 'navigate', target: 'account' })
    })
  })

  describe('describe commands', () => {
    it('parses "describe account"', () => {
      expect(parseCommand('describe account')).toEqual({ type: 'describe', target: 'account' })
    })

    it('parses "explain opportunity"', () => {
      expect(parseCommand('explain opportunity')).toEqual({ type: 'describe', target: 'opportunity' })
    })

    it('parses "what is a contact"', () => {
      expect(parseCommand('what is a contact')).toEqual({ type: 'describe', target: 'a contact' })
    })

    it('parses "tell me about cases"', () => {
      expect(parseCommand('tell me about cases')).toEqual({ type: 'describe', target: 'cases' })
    })
  })

  describe('relate commands', () => {
    it('parses "how is account related to contact"', () => {
      const cmd = parseCommand('how is account related to contact')
      expect(cmd.type).toBe('relate')
      if (cmd.type === 'relate') {
        expect(cmd.table1).toContain('account')
        expect(cmd.table2).toContain('contact')
      }
    })

    it('parses "relationship between leads and opportunities"', () => {
      const cmd = parseCommand('relationship between leads and opportunities')
      expect(cmd.type).toBe('relate')
    })
  })

  describe('tour commands', () => {
    it('parses "give me a tour"', () => {
      expect(parseCommand('give me a tour')).toEqual({ type: 'tour' })
    })

    it('parses "show me everything" as navigate (navigate regex matches first)', () => {
      // "show me" matches the navigate pattern before the tour keyword check
      expect(parseCommand('show me everything')).toEqual({ type: 'navigate', target: 'everything' })
    })

    it('parses "overview"', () => {
      expect(parseCommand('overview')).toEqual({ type: 'tour' })
    })
  })

  describe('sync commands', () => {
    it('parses "sync"', () => {
      expect(parseCommand('sync')).toEqual({ type: 'sync' })
    })

    it('parses "refresh"', () => {
      expect(parseCommand('refresh')).toEqual({ type: 'sync' })
    })

    it('parses "reload tables"', () => {
      expect(parseCommand('reload tables')).toEqual({ type: 'sync' })
    })

    it('parses "re-scan"', () => {
      expect(parseCommand('re-scan')).toEqual({ type: 'sync' })
    })

    it('parses "validate tables"', () => {
      expect(parseCommand('validate tables')).toEqual({ type: 'sync' })
    })
  })

  describe('analyze commands', () => {
    it('parses "which table has the most records"', () => {
      const cmd = parseCommand('which table has the most records')
      expect(cmd.type).toBe('analyze')
    })

    it('parses "how many tables are there"', () => {
      const cmd = parseCommand('how many tables are there')
      expect(cmd.type).toBe('analyze')
    })

    it('parses "largest table"', () => {
      const cmd = parseCommand('largest table')
      expect(cmd.type).toBe('analyze')
    })
  })

  describe('create commands', () => {
    it('parses "create an app for tracking projects"', () => {
      const cmd = parseCommand('create an app for tracking projects')
      expect(cmd.type).toBe('create')
      if (cmd.type === 'create') {
        expect(cmd.description).toContain('app for tracking projects')
      }
    })

    it('parses "build a dashboard"', () => {
      const cmd = parseCommand('build a dashboard')
      expect(cmd.type).toBe('create')
    })
  })

  describe('general fallback', () => {
    it('returns general for unrecognized input', () => {
      expect(parseCommand('hello there')).toEqual({ type: 'general', message: 'hello there' })
    })

    it('returns general for empty string', () => {
      expect(parseCommand('')).toEqual({ type: 'general', message: '' })
    })
  })
})

describe('executeCommand', () => {
  const mockTables = [
    {
      id: 'account', name: 'account', displayName: 'Account', domain: 'Core' as const,
      recordCount: 2450, position: [0, 1, 0] as [number, number, number],
      columns: [{ name: 'name', displayName: 'Name', dataType: 'string', isRequired: true }],
      relationships: ['contact'],
      entitySetName: 'accounts', primaryNameAttribute: 'name', primaryIdAttribute: 'accountid',
    },
    {
      id: 'contact', name: 'contact', displayName: 'Contact', domain: 'Core' as const,
      recordCount: 8920, position: [6, 1, 0] as [number, number, number],
      columns: [{ name: 'fullname', displayName: 'Full Name', dataType: 'string', isRequired: true }],
      relationships: ['account'],
      entitySetName: 'contacts', primaryNameAttribute: 'fullname', primaryIdAttribute: 'contactid',
    },
    {
      id: 'opportunity', name: 'opportunity', displayName: 'Opportunity', domain: 'Sales' as const,
      recordCount: 1850, position: [80, 1, 0] as [number, number, number],
      columns: [{ name: 'name', displayName: 'Topic', dataType: 'string', isRequired: true }],
      relationships: ['account'],
      entitySetName: 'opportunities', primaryNameAttribute: 'name', primaryIdAttribute: 'opportunityid',
    },
  ]

  const mockRelationships = [
    { id: 'rel-0', sourceTableId: 'account', targetTableId: 'contact', type: 'one-to-many' as const },
    { id: 'rel-1', sourceTableId: 'account', targetTableId: 'opportunity', type: 'one-to-many' as const },
  ]

  beforeEach(() => {
    useAppStore.setState({
      tables: mockTables,
      relationships: mockRelationships,
      selectedTableId: null,
      flyToTarget: null,
    })
  })

  it('navigate: finds table by display name', async () => {
    const result = await executeCommand({ type: 'navigate', target: 'Account' })
    expect(result.response).toContain('Account')
    expect(result.action).toBeDefined()
  })

  it('navigate: returns not-found for unknown table', async () => {
    const result = await executeCommand({ type: 'navigate', target: 'nonexistent' })
    expect(result.response).toContain("couldn't find")
    expect(result.action).toBeUndefined()
  })

  it('describe: returns table details', async () => {
    const result = await executeCommand({ type: 'describe', target: 'Account' })
    expect(result.response).toContain('Account')
    expect(result.response).toContain('Core')
    expect(result.response).toContain('Name')
  })

  it('describe: returns not-found for unknown table', async () => {
    const result = await executeCommand({ type: 'describe', target: 'xyz' })
    expect(result.response).toContain("couldn't find")
  })

  it('relate: finds direct relationship', async () => {
    const result = await executeCommand({ type: 'relate', table1: 'Account', table2: 'Contact' })
    expect(result.response).toContain('directly connected')
    expect(result.response).toContain('one-to-many')
  })

  it('relate: finds indirect relationship through shared table', async () => {
    const result = await executeCommand({ type: 'relate', table1: 'Contact', table2: 'Opportunity' })
    // Both connect through account
    expect(result.response).toContain('Account')
  })

  it('relate: reports no relationship when none exists', async () => {
    // Remove all relationships
    useAppStore.setState({ relationships: [] })
    const result = await executeCommand({ type: 'relate', table1: 'Account', table2: 'Contact' })
    expect(result.response).toContain("don't appear to have")
  })

  it('tour: provides overview', async () => {
    const result = await executeCommand({ type: 'tour' })
    expect(result.response).toContain('Core')
    expect(result.response).toContain('3 tables')
    expect(result.response).toContain('2 relationships')
    expect(result.action).toBeDefined()
  })

  it('analyze: finds tables with most records', async () => {
    const result = await executeCommand({ type: 'analyze', query: 'which table has the most records' })
    expect(result.response).toContain('Contact')
  })

  it('analyze: finds most connected tables', async () => {
    const result = await executeCommand({ type: 'analyze', query: 'most connected table' })
    expect(result.response).toContain('Account')
  })

  it('analyze: returns help for unknown queries', async () => {
    const result = await executeCommand({ type: 'analyze', query: 'something random' })
    expect(result.response).toContain('I can answer questions')
  })

  it('create: returns creation message', async () => {
    const result = await executeCommand({ type: 'create', description: 'a sales dashboard' })
    expect(result.response).toContain('a sales dashboard')
  })

  it('sync: returns unavailable in demo mode', async () => {
    const result = await executeCommand({ type: 'sync' })
    expect(result.response).toContain('not available')
  })

  it('sync: calls __dveSyncTables when available', async () => {
    const syncFn = vi.fn()
    ;(window as any).__dveSyncTables = syncFn
    const result = await executeCommand({ type: 'sync' })
    expect(result.response).toContain('sync')
    result.action?.()
    expect(syncFn).toHaveBeenCalled()
    delete (window as any).__dveSyncTables
  })

  it('general: returns help text', async () => {
    const result = await executeCommand({ type: 'general', message: 'hello' })
    expect(result.response).toContain('Dataverse guide')
  })
})
