import { describe, it, expect } from 'vitest'
import { classifyTable, getDomainSectors } from '@/data/cdmClassifier'

describe('classifyTable', () => {
  describe('known table mappings', () => {
    const knownCoreTables = ['account', 'contact', 'activitypointer', 'annotation', 'systemuser', 'team', 'businessunit', 'email', 'phonecall', 'task', 'appointment', 'letter', 'fax', 'connection', 'customeraddress']
    it.each(knownCoreTables)('classifies %s as Core', (table) => {
      expect(classifyTable(table, false)).toBe('Core')
    })

    const knownSalesTables = ['opportunity', 'lead', 'quote', 'quotedetail', 'salesorder', 'salesorderdetail', 'invoice', 'invoicedetail', 'competitor', 'discount', 'opportunityclose', 'orderclose']
    it.each(knownSalesTables)('classifies %s as Sales', (table) => {
      expect(classifyTable(table, false)).toBe('Sales')
    })

    const knownServiceTables = ['incident', 'knowledgearticle', 'entitlement', 'entitlementchannel', 'sla', 'slakpiinstance', 'incidentresolution', 'contract', 'contractdetail']
    it.each(knownServiceTables)('classifies %s as Service', (table) => {
      expect(classifyTable(table, false)).toBe('Service')
    })

    const knownMarketingTables = ['campaign', 'campaignactivity', 'campaignresponse', 'list', 'bulkoperation']
    it.each(knownMarketingTables)('classifies %s as Marketing', (table) => {
      expect(classifyTable(table, false)).toBe('Marketing')
    })

    const knownFinanceTables = ['product', 'pricelevel', 'productpricelevel', 'uom', 'uomschedule', 'transactioncurrency', 'discount_type']
    it.each(knownFinanceTables)('classifies %s as Finance', (table) => {
      expect(classifyTable(table, false)).toBe('Finance')
    })
  })

  describe('custom entity detection', () => {
    it('classifies custom entities as Custom', () => {
      expect(classifyTable('cr_project', true)).toBe('Custom')
      expect(classifyTable('new_widget', true)).toBe('Custom')
    })

    it('known tables override custom flag', () => {
      expect(classifyTable('account', true)).toBe('Core')
      expect(classifyTable('opportunity', true)).toBe('Sales')
    })
  })

  describe('pattern-based inference', () => {
    it('infers Sales from name patterns', () => {
      expect(classifyTable('msdyn_salesinsight', false)).toBe('Sales')
      expect(classifyTable('msdyn_revenue_tracker', false)).toBe('Sales')
      expect(classifyTable('pipeline_stage', false)).toBe('Sales')
    })

    it('infers Service from name patterns', () => {
      expect(classifyTable('msdyn_case_routing', false)).toBe('Service')
      expect(classifyTable('serviceendpoint', false)).toBe('Service')
      expect(classifyTable('support_ticket', false)).toBe('Service')
    })

    it('infers Marketing from name patterns', () => {
      expect(classifyTable('marketing_form', false)).toBe('Marketing')
      expect(classifyTable('msdyn_campaign_analytics', false)).toBe('Marketing')
    })

    it('infers Finance from name patterns', () => {
      expect(classifyTable('msdyn_productinventory', false)).toBe('Finance')
      expect(classifyTable('price_override', false)).toBe('Finance')
    })

    it('defaults unknown system tables to Core', () => {
      expect(classifyTable('asyncoperation', false)).toBe('Core')
      expect(classifyTable('workflowlog', false)).toBe('Core')
    })
  })
})

describe('getDomainSectors', () => {
  it('returns 6 domain sectors', () => {
    const sectors = getDomainSectors()
    expect(sectors).toHaveLength(6)
  })

  it('includes all CDM domains', () => {
    const sectors = getDomainSectors()
    const domains = sectors.map((s) => s.domain)
    expect(domains).toEqual(['Core', 'Sales', 'Service', 'Marketing', 'Finance', 'Custom'])
  })

  it('Core sector is at center (radius 0)', () => {
    const core = getDomainSectors().find((s) => s.domain === 'Core')
    expect(core?.radius).toBe(0)
    expect(core?.angle).toBe(0)
  })

  it('Custom sector has the largest radius', () => {
    const sectors = getDomainSectors()
    const custom = sectors.find((s) => s.domain === 'Custom')!
    const maxRadius = Math.max(...sectors.map((s) => s.radius))
    expect(custom.radius).toBe(maxRadius)
  })

  it('each sector has a label and description', () => {
    for (const sector of getDomainSectors()) {
      expect(sector.label).toBeTruthy()
      expect(sector.description).toBeTruthy()
    }
  })
})
