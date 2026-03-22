/**
 * Table Descriptions — short purpose descriptions and learn.microsoft.com links
 * for standard Dataverse tables.
 */

export interface TableInfo {
  description: string
}


/** Standard Dataverse table descriptions keyed by logical name */
export const TABLE_DESCRIPTIONS: Record<string, TableInfo> = {
  // ── Core ──
  account: {
    description: 'Represents a business, organization, or person that your company has a relationship with. Accounts are one of the primary entities for tracking business interactions.',
  },
  contact: {
    description: 'Represents an individual person, typically associated with an account. Contacts store personal information like name, email, phone, and address.',
  },
  systemuser: {
    description: 'A user within the Dynamics 365 / Power Platform organization. Contains security roles, business unit membership, and user settings.',
  },
  team: {
    description: 'A group of users who share responsibilities and can own records. Teams enable collaborative security and access management.',
  },
  businessunit: {
    description: 'An organizational unit within the business hierarchy. Business units define the security and data access structure.',
  },
  organization: {
    description: 'The top-level entity representing the entire Dataverse environment. Contains org-wide settings like currency, language, and fiscal year.',
  },
  role: {
    description: 'A security role that defines a set of privileges. Roles are assigned to users and teams to control data access.',
  },
  transactioncurrency: {
    description: 'Defines a currency used in the organization for financial calculations. Includes exchange rate relative to the base currency.',
  },
  annotation: {
    description: 'A note or attachment associated with any record. Supports text notes, file attachments, and rich content linked to parent entities.',
  },
  connection: {
    description: 'Represents a flexible relationship between two records. Connections enable ad-hoc linking of entities beyond formal relationships.',
  },
  connectionrole: {
    description: 'Defines the type of connection between records, such as "Friend," "Colleague," or "Vendor." Used to categorize connections.',
  },
  subject: {
    description: 'A hierarchical categorization topic used to classify cases, knowledge articles, and other records for reporting and routing.',
  },
  territory: {
    description: 'A geographic or logical sales territory used to organize accounts, leads, and sales reps by region.',
  },
  calendar: {
    description: 'Defines working hours, holidays, and scheduling rules. Used by SLAs, scheduling, and resource management.',
  },

  // ── Sales ──
  lead: {
    description: 'A potential sales opportunity or prospect that has not yet been qualified. Leads are the entry point of the sales pipeline.',
  },
  opportunity: {
    description: 'A qualified sales deal being actively pursued. Tracks estimated revenue, probability, close date, and sales stage.',
  },
  quote: {
    description: 'A formal offer of products or services at specified prices. Quotes can be revised and eventually converted to orders.',
  },
  salesorder: {
    description: 'A confirmed order for products or services. Represents a commitment from the customer to purchase.',
  },
  invoice: {
    description: 'A billing document for products or services delivered. Invoices track payment status and amounts owed.',
  },
  product: {
    description: 'An item in the product catalog that can be sold. Contains pricing, unit groups, and product family information.',
  },
  pricelevel: {
    description: 'A price list that defines the pricing for products. Multiple price lists support different regions, channels, or customer tiers.',
  },
  competitor: {
    description: 'A competing organization tracked in the sales process. Contains strengths, weaknesses, and competitive positioning.',
  },
  opportunityproduct: {
    description: 'A line item on an opportunity representing a specific product being sold, with quantity and pricing details.',
  },
  quotedetail: {
    description: 'A line item on a quote specifying a product, quantity, and price offered to the customer.',
  },
  salesorderdetail: {
    description: 'A line item on a sales order specifying a product, quantity, and confirmed price.',
  },
  invoicedetail: {
    description: 'A line item on an invoice for a specific product or service delivered, with billing amount.',
  },
  discount: {
    description: 'A discount amount applied to a product within a specific price range. Part of a discount list.',
  },
  discounttype: {
    description: 'A discount list that groups discount rules. Applied to products via price list items.',
  },
  opportunityclose: {
    description: 'An activity that records the closing of an opportunity, whether won or lost. Captures close reason and competitor info.',
  },
  orderclose: {
    description: 'An activity that records the fulfillment or cancellation of a sales order.',
  },

  // ── Service ──
  incident: {
    description: 'A customer service case or support ticket. Tracks the issue, priority, status, and resolution for customer problems.',
  },
  knowledgearticle: {
    description: 'A knowledge base article containing solutions, procedures, or reference information for customer service agents.',
  },
  knowledgebaserecord: {
    description: 'A reference to an external knowledge base article linked to a Dataverse record.',
  },
  entitlement: {
    description: 'Defines the support terms for a customer, including the number of cases or hours of service they are entitled to.',
  },
  contract: {
    description: 'A service agreement that specifies the terms and conditions for customer support.',
  },
  contractdetail: {
    description: 'A line item in a service contract specifying coverage details for a specific product or service.',
  },
  contracttemplate: {
    description: 'A reusable template for creating service contracts with predefined terms and billing rules.',
  },
  feedback: {
    description: 'Customer feedback or survey responses associated with a record. Includes ratings and comments.',
  },
  sla: {
    description: 'A Service Level Agreement that defines response and resolution time targets for cases.',
  },
  slakpiinstance: {
    description: 'Tracks the status of a specific SLA KPI against a case — whether the SLA target was met or breached.',
  },
  queue: {
    description: 'A work queue for organizing and routing cases, activities, and other records to teams or individuals.',
  },
  queueitem: {
    description: 'An individual item placed in a queue, linking a record to a queue for processing.',
  },

  // ── Marketing ──
  campaign: {
    description: 'A marketing campaign for promoting products or services. Tracks goals, budget, and associated marketing activities.',
  },
  campaignactivity: {
    description: 'A specific marketing activity within a campaign, such as an email blast, event, or direct mailer.',
  },
  campaignresponse: {
    description: 'A response received from a campaign activity, indicating customer engagement or interest.',
  },
  list: {
    description: 'A marketing list of accounts, contacts, or leads used for targeted campaigns and communication.',
  },
  bulkoperation: {
    description: 'A bulk activity that distributes campaign activities (emails, phone calls, etc.) to a marketing list.',
  },

  // ── Activities ──
  activitypointer: {
    description: 'The base activity entity that all activities (email, phone call, task, etc.) inherit from. Contains shared fields like subject and dates.',
  },
  email: {
    description: 'An email message activity that can be sent, received, and tracked within the system.',
  },
  phonecall: {
    description: 'A phone call activity recording a conversation or call attempt with details like direction, duration, and outcome.',
  },
  appointment: {
    description: 'A scheduled meeting or appointment with a specific time, location, and attendees.',
  },
  task: {
    description: 'A to-do item or work action assigned to a user. Tracks priority, due date, and completion status.',
  },
  letter: {
    description: 'A physical letter activity for tracking postal correspondence sent or received.',
  },
  fax: {
    description: 'A fax activity for tracking fax communications sent or received.',
  },
  socialactivity: {
    description: 'A social media interaction activity, such as a post, comment, or mention from social channels.',
  },
  recurringappointmentmaster: {
    description: 'The master record for a recurring appointment series, defining the recurrence pattern and settings.',
  },

  // ── Goals ──
  goal: {
    description: 'A measurable business objective that tracks progress against a target, such as revenue or case resolution goals.',
  },
  metric: {
    description: 'Defines what is measured by a goal — the target metric such as revenue, count, or custom measure.',
  },
  rollupfield: {
    description: 'Specifies which fields to aggregate when calculating goal progress, including filters and date ranges.',
  },
  goalrollupquery: {
    description: 'A saved query that defines which records participate in goal rollup calculations.',
  },

  // ── Process / Automation ──
  workflow: {
    description: 'A business process definition — Power Automate flow, classic workflow, action, or business rule configuration.',
  },
  processsession: {
    description: 'An instance of a running process or dialog. Tracks the execution state and history of a workflow.',
  },
  processstage: {
    description: 'A stage within a business process flow, representing a step in a guided business procedure.',
  },

  // ── Documents ──
  sharepointsite: {
    description: 'A SharePoint site integration that links Dataverse records to SharePoint document libraries.',
  },
  sharepointdocumentlocation: {
    description: 'A specific folder location in SharePoint linked to a Dataverse record for document storage.',
  },

  // ── Solutions / Platform ──
  solution: {
    description: 'A container for customizations and components that can be exported and imported between environments.',
  },
  publisher: {
    description: 'The publisher of a solution, defining the customization prefix and contact information.',
  },
  sdkmessage: {
    description: 'An SDK message representing an API operation (Create, Update, Delete, etc.) that can be extended with plugins.',
  },
  sdkmessagefilter: {
    description: 'A filter that restricts an SDK message step to a specific entity, controlling plugin/workflow trigger scope.',
  },
  appmodule: {
    description: 'A model-driven app definition containing sitemap, forms, views, and dashboards configured for a specific business role.',
  },

  // ── Bookable Resources ──
  bookableresource: {
    description: 'A resource (person, equipment, facility) that can be scheduled and booked for service delivery.',
  },
  bookableresourcebooking: {
    description: 'A specific booking of a resource for a time slot, linked to a work order or service requirement.',
  },
  bookableresourcecategory: {
    description: 'A category for classifying bookable resources, such as "Technician," "Equipment," or "Facility."',
  },
  characteristic: {
    description: 'A skill, certification, or attribute that can be associated with bookable resources for matching.',
  },
  ratingmodel: {
    description: 'A rating scale model used to assess proficiency levels of resource characteristics.',
  },
  ratingvalue: {
    description: 'A specific rating level within a rating model, defining the proficiency score and label.',
  },

  // ── Project Operations ──
  msdyn_project: {
    description: 'A project record tracking scope, schedule, team, and financials for project-based work delivery.',
  },
  msdyn_projecttask: {
    description: 'A task within a project work breakdown structure, with effort estimates, dates, and assignments.',
  },
  msdyn_resourcerequirement: {
    description: 'A resource requirement specifying the skills, roles, and availability needed for project or service work.',
  },
  msdyn_timeentry: {
    description: 'A time entry recorded by a resource against a project task or activity for tracking and billing.',
  },
  msdyn_expense: {
    description: 'An expense entry for project-related costs such as travel, materials, or other reimbursable items.',
  },
  msdyn_estimate: {
    description: 'A financial estimate for project work, including cost and sales amounts by transaction class.',
  },
  msdyn_projectteam: {
    description: 'A team member assigned to a project, specifying their role, allocation, and booking method.',
  },
  msdyn_resourceassignment: {
    description: 'The assignment of a resource to a specific project task with effort and date details.',
  },

  // ── Field Service ──
  msdyn_workorder: {
    description: 'A work order for field service, defining the job to be performed, location, and assigned resources.',
  },
  msdyn_workorderproduct: {
    description: 'A product line item on a work order, tracking parts or materials used during field service.',
  },
  msdyn_workorderservice: {
    description: 'A service line item on a work order, tracking labor or service activities performed in the field.',
  },
  msdyn_agreement: {
    description: 'A recurring service agreement that automatically generates work orders on a defined schedule.',
  },
  msdyn_customerasset: {
    description: 'A customer-owned asset (equipment, device) tracked for maintenance, warranty, and service history.',
  },
  msdyn_incidenttype: {
    description: 'A predefined issue type for work orders that auto-populates service tasks, products, and skills needed.',
  },

  // ── AI ──
  aiplugin: {
    description: 'A Copilot AI plugin definition that exposes actions and knowledge to AI assistants in Power Platform.',
  },
  aipluginoperation: {
    description: 'An operation defined within an AI plugin, specifying the API call, parameters, and response schema.',
  },
  msdyn_aiconfiguration: {
    description: 'Configuration for an AI Builder model, including training data, performance metrics, and deployment settings.',
  },
  msdyn_aimodel: {
    description: 'An AI Builder model instance that can be used for prediction, classification, or document processing.',
  },
  msdyn_aitemplate: {
    description: 'A template for creating AI Builder models, defining the model type and required training data format.',
  },
}

/**
 * Get the description for a table, with a sensible fallback.
 */
export function getTableDescription(logicalName: string): string {
  return TABLE_DESCRIPTIONS[logicalName]?.description ?? ''
}

/**
 * Get a learn.microsoft.com search URL for a table.
 * Uses search instead of direct entity reference URLs because many standard
 * table pages have moved or return 404.
 */
export function getTableLearnUrl(logicalName: string): string {
  return `https://learn.microsoft.com/en-us/search?terms=${encodeURIComponent(logicalName + ' table dataverse')}`
}
