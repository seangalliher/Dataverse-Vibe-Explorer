/**
 * CDM Domain Classifier — maps Dataverse tables to CDM semantic domains
 * for spatial grouping in the 3D scene.
 */

import type { CDMDomain } from '@/utils/colors'

/** Well-known Dataverse table → CDM domain mapping */
const KNOWN_TABLE_DOMAINS: Record<string, CDMDomain> = {
  // Core
  account: 'Core',
  contact: 'Core',
  activitypointer: 'Core',
  annotation: 'Core',
  systemuser: 'Core',
  team: 'Core',
  businessunit: 'Core',
  email: 'Core',
  phonecall: 'Core',
  task: 'Core',
  appointment: 'Core',
  letter: 'Core',
  fax: 'Core',
  connection: 'Core',
  customeraddress: 'Core',

  // Sales
  opportunity: 'Sales',
  lead: 'Sales',
  quote: 'Sales',
  quotedetail: 'Sales',
  salesorder: 'Sales',
  salesorderdetail: 'Sales',
  invoice: 'Sales',
  invoicedetail: 'Sales',
  competitor: 'Sales',
  discount: 'Sales',
  opportunityclose: 'Sales',
  orderclose: 'Sales',

  // Service
  incident: 'Service',
  knowledgearticle: 'Service',
  entitlement: 'Service',
  entitlementchannel: 'Service',
  sla: 'Service',
  slakpiinstance: 'Service',
  incidentresolution: 'Service',
  contract: 'Service',
  contractdetail: 'Service',

  // Marketing
  campaign: 'Marketing',
  campaignactivity: 'Marketing',
  campaignresponse: 'Marketing',
  list: 'Marketing',
  bulkoperation: 'Marketing',

  // Finance
  product: 'Finance',
  pricelevel: 'Finance',
  productpricelevel: 'Finance',
  uom: 'Finance',
  uomschedule: 'Finance',
  transactioncurrency: 'Finance',
  discount_type: 'Finance',
}

/**
 * Classify a Dataverse table into a CDM domain.
 * Uses known mappings first, then falls back to schema name prefix analysis.
 */
export function classifyTable(logicalName: string, isCustom: boolean): CDMDomain {
  // Check known mapping first
  const known = KNOWN_TABLE_DOMAINS[logicalName]
  if (known) return known

  // Custom entities go to Custom domain
  if (isCustom) return 'Custom'

  // Try to infer from name patterns
  const name = logicalName.toLowerCase()
  if (name.includes('sales') || name.includes('revenue') || name.includes('pipeline')) return 'Sales'
  if (name.includes('case') || name.includes('service') || name.includes('support')) return 'Service'
  if (name.includes('campaign') || name.includes('market')) return 'Marketing'
  if (name.includes('product') || name.includes('price') || name.includes('invoice')) return 'Finance'

  // Default unknown system tables to Core
  return 'Core'
}

/**
 * Get the spatial sector configuration for a domain.
 */
export interface DomainSector {
  domain: CDMDomain
  label: string
  angle: number      // Base angle in radians
  radius: number     // Base distance from center
  description: string
}

export function getDomainSectors(): DomainSector[] {
  return [
    { domain: 'Core', label: 'Core', angle: 0, radius: 0, description: 'Foundation entities — Accounts, Contacts, Activities' },
    { domain: 'Sales', label: 'Sales District', angle: Math.PI * 0.35, radius: 35, description: 'Pipeline, opportunities, quotes & orders' },
    { domain: 'Service', label: 'Service Zone', angle: Math.PI * 0.75, radius: 35, description: 'Cases, knowledge, entitlements' },
    { domain: 'Marketing', label: 'Marketing Quarter', angle: Math.PI * 1.15, radius: 35, description: 'Campaigns, lists, outreach' },
    { domain: 'Finance', label: 'Operations Hub', angle: Math.PI * 1.55, radius: 35, description: 'Products, pricing, currencies' },
    { domain: 'Custom', label: 'Frontier', angle: Math.PI * 1.85, radius: 50, description: 'Custom-built tables & solutions' },
  ]
}
