import { describe, it, expect } from 'vitest'
import { buildSceneGraph, positionNewTables, getDomainBlockCenter } from '@/data/sceneGraph'
import type { TableMetadata, RelationshipMetadata } from '@/data/metadata'

function makeTable(logicalName: string, displayName: string, recordCount = 100, isCustom = false): TableMetadata {
  return {
    logicalName,
    displayName,
    description: '',
    entitySetName: `${logicalName}s`,
    primaryIdAttribute: `${logicalName}id`,
    primaryNameAttribute: 'name',
    recordCount,
    columns: [
      { logicalName: 'name', displayName: 'Name', description: '', attributeType: 'string', isRequired: true, isPrimaryId: false, isPrimaryName: true },
    ],
    isCustom,
    schemaName: logicalName,
  }
}

function makeRel(from: string, to: string, type: 'one-to-many' | 'many-to-many' = 'one-to-many'): RelationshipMetadata {
  return {
    schemaName: `${from}_${to}`,
    referencingEntity: to,
    referencedEntity: from,
    referencingAttribute: `${from}id`,
    referencedAttribute: `${from}id`,
    type,
  }
}

describe('buildSceneGraph', () => {
  it('returns empty arrays for empty input', () => {
    const result = buildSceneGraph([], [])
    expect(result.tables).toEqual([])
    expect(result.relationships).toEqual([])
  })

  it('creates table nodes from metadata', () => {
    const tables = [makeTable('account', 'Account', 2450)]
    const result = buildSceneGraph(tables, [])
    expect(result.tables).toHaveLength(1)
    expect(result.tables[0].id).toBe('account')
    expect(result.tables[0].displayName).toBe('Account')
    expect(result.tables[0].recordCount).toBe(2450)
    expect(result.tables[0].domain).toBe('Core')
  })

  it('assigns correct domains based on cdmClassifier', () => {
    const tables = [
      makeTable('account', 'Account'),
      makeTable('opportunity', 'Opportunity'),
      makeTable('incident', 'Case'),
      makeTable('campaign', 'Campaign'),
      makeTable('product', 'Product'),
      makeTable('cr_custom', 'Custom', 50, true),
    ]
    const result = buildSceneGraph(tables, [])
    const domainMap = new Map(result.tables.map((t) => [t.id, t.domain]))
    expect(domainMap.get('account')).toBe('Core')
    expect(domainMap.get('opportunity')).toBe('Sales')
    expect(domainMap.get('incident')).toBe('Service')
    expect(domainMap.get('campaign')).toBe('Marketing')
    expect(domainMap.get('product')).toBe('Finance')
    expect(domainMap.get('cr_custom')).toBe('Custom')
  })

  it('creates relationship edges between known tables', () => {
    const tables = [makeTable('account', 'Account'), makeTable('contact', 'Contact')]
    const rels = [makeRel('account', 'contact')]
    const result = buildSceneGraph(tables, rels)
    expect(result.relationships).toHaveLength(1)
    expect(result.relationships[0].sourceTableId).toBe('account')
    expect(result.relationships[0].targetTableId).toBe('contact')
    expect(result.relationships[0].type).toBe('one-to-many')
  })

  it('excludes relationships referencing unknown tables', () => {
    const tables = [makeTable('account', 'Account')]
    const rels = [makeRel('account', 'unknown_table')]
    const result = buildSceneGraph(tables, rels)
    expect(result.relationships).toHaveLength(0)
  })

  it('populates columns on table nodes', () => {
    const table = makeTable('account', 'Account')
    table.columns = [
      { logicalName: 'name', displayName: 'Name', description: '', attributeType: 'string', isRequired: true, isPrimaryId: false, isPrimaryName: true },
      { logicalName: 'revenue', displayName: 'Revenue', description: '', attributeType: 'currency', isRequired: false, isPrimaryId: false, isPrimaryName: false },
    ]
    const result = buildSceneGraph([table], [])
    expect(result.tables[0].columns).toHaveLength(2)
    expect(result.tables[0].columns[0].name).toBe('name')
    expect(result.tables[0].columns[0].dataType).toBe('string')
    expect(result.tables[0].columns[1].name).toBe('revenue')
  })

  it('populates relationships list on table nodes', () => {
    const tables = [makeTable('account', 'Account'), makeTable('contact', 'Contact'), makeTable('opportunity', 'Opportunity')]
    const rels = [makeRel('account', 'contact'), makeRel('account', 'opportunity')]
    const result = buildSceneGraph(tables, rels)
    const account = result.tables.find((t) => t.id === 'account')!
    expect(account.relationships).toContain('contact')
    expect(account.relationships).toContain('opportunity')
  })

  it('assigns 3D positions to all tables', () => {
    const tables = [makeTable('account', 'Account'), makeTable('contact', 'Contact')]
    const result = buildSceneGraph(tables, [])
    for (const t of result.tables) {
      expect(t.position).toHaveLength(3)
      expect(typeof t.position[0]).toBe('number')
      expect(typeof t.position[1]).toBe('number')
      expect(typeof t.position[2]).toBe('number')
    }
  })

  it('sorts tables by relationship count within domains', () => {
    const tables = [
      makeTable('account', 'Account'),
      makeTable('contact', 'Contact'),
      makeTable('systemuser', 'User'),
    ]
    // account has 2 rels, contact has 1, systemuser has 0
    const rels = [makeRel('account', 'contact'), makeRel('account', 'systemuser')]
    const result = buildSceneGraph(tables, rels)
    const coreTables = result.tables.filter((t) => t.domain === 'Core')
    // account should come first (most relationships)
    expect(coreTables[0].id).toBe('account')
  })

  it('handles many-to-many relationship type', () => {
    const tables = [makeTable('incident', 'Case'), makeTable('knowledgearticle', 'KB Article')]
    const rels = [makeRel('incident', 'knowledgearticle', 'many-to-many')]
    const result = buildSceneGraph(tables, rels)
    expect(result.relationships[0].type).toBe('many-to-many')
  })
})

describe('positionNewTables', () => {
  it('returns empty array for empty input', () => {
    expect(positionNewTables([], [])).toEqual([])
  })

  it('positions new tables using domain-based grid', () => {
    const newMeta = [makeTable('email', 'Email')]
    const result = positionNewTables(newMeta, [])
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('email')
    expect(result[0].position).toHaveLength(3)
  })

  it('offsets new tables after existing ones in same domain', () => {
    const existing = [
      { id: 'account', name: 'account', displayName: 'Account', domain: 'Core' as const, recordCount: 100, position: [0, 0, 0] as [number, number, number], columns: [], relationships: [] },
    ]
    const newMeta = [makeTable('contact', 'Contact')]
    const result = positionNewTables(newMeta, existing)
    // Second core table should be offset from first
    expect(result[0].position).not.toEqual(existing[0].position)
  })

  it('classifies domain for new tables', () => {
    const result = positionNewTables([makeTable('cr_widget', 'Widget', 50, true)], [])
    expect(result[0].domain).toBe('Custom')
  })

  it('sets empty relationships on new tables', () => {
    const result = positionNewTables([makeTable('account', 'Account')], [])
    expect(result[0].relationships).toEqual([])
  })
})

describe('getDomainBlockCenter', () => {
  it('returns a 3D position', () => {
    const pos = getDomainBlockCenter('Core', 10)
    expect(pos).toHaveLength(3)
  })

  it('returns y=5 for label height', () => {
    const pos = getDomainBlockCenter('Sales', 5)
    expect(pos[1]).toBe(5)
  })

  it('returns different centers for different domains', () => {
    const core = getDomainBlockCenter('Core', 10)
    const sales = getDomainBlockCenter('Sales', 10)
    expect(core[0]).not.toEqual(sales[0])
  })

  it('handles zero table count', () => {
    const pos = getDomainBlockCenter('Core', 0)
    expect(pos).toHaveLength(3)
    expect(Number.isFinite(pos[0])).toBe(true)
  })

  it('horizontally shifts center based on table count', () => {
    const small = getDomainBlockCenter('Core', 1)
    const large = getDomainBlockCenter('Core', 20)
    // With more tables, center should shift to accommodate wider block
    expect(large[0]).not.toEqual(small[0])
  })
})
