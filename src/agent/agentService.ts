/**
 * Agent Service — handles communication with the Dataverse MCP server
 * and processes agent commands for exploration and creation.
 */
import { useAppStore, type TableNode, type ChatMessage } from '@/store/appStore'
import { formatRecordCount } from '@/data/dataverse'

export type AgentCommand =
  | { type: 'navigate'; target: string }
  | { type: 'describe'; target: string }
  | { type: 'relate'; table1: string; table2: string }
  | { type: 'tour' }
  | { type: 'analyze'; query: string }
  | { type: 'create'; description: string }
  | { type: 'sync' }
  | { type: 'general'; message: string }

/**
 * Parse a user message into an agent command.
 */
export function parseCommand(message: string): AgentCommand {
  const lower = message.toLowerCase().trim()

  // Navigation commands
  const navigateMatch = lower.match(/(?:show me|go to|navigate to|find|take me to)\s+(.+)/i)
  if (navigateMatch) {
    return { type: 'navigate', target: navigateMatch[1] }
  }

  // Describe commands
  const describeMatch = lower.match(/(?:describe|explain|what is|tell me about)\s+(.+)/i)
  if (describeMatch) {
    return { type: 'describe', target: describeMatch[1] }
  }

  // Relationship commands
  const relateMatch = lower.match(/(?:how is|how are|relationship between|relate)\s+(.+?)\s+(?:and|to|with)\s+(.+)/i)
  if (relateMatch) {
    return { type: 'relate', table1: relateMatch[1], table2: relateMatch[2] }
  }

  // Tour command
  if (lower.includes('tour') || lower.includes('show me everything') || lower.includes('overview')) {
    return { type: 'tour' }
  }

  // Sync command
  if (lower.includes('sync') || lower.includes('refresh') || lower.includes('reload tables') || lower.includes('re-scan') || lower.includes('rescan') || lower.includes('validate tables')) {
    return { type: 'sync' }
  }

  // Analysis commands
  const analyzeMatch = lower.match(/(?:which|what|how many|largest|smallest|most)\s+(.+)/i)
  if (analyzeMatch) {
    return { type: 'analyze', query: message }
  }

  // Create commands
  const createMatch = lower.match(/(?:create|build|make|generate)\s+(.+)/i)
  if (createMatch) {
    return { type: 'create', description: createMatch[1] }
  }

  return { type: 'general', message }
}

/**
 * Find a table by fuzzy name matching.
 */
function findTable(tables: TableNode[], query: string): TableNode | undefined {
  const q = query.toLowerCase().replace(/table|entity|the/g, '').trim()
  return (
    tables.find((t) => t.displayName.toLowerCase() === q) ??
    tables.find((t) => t.name.toLowerCase() === q) ??
    tables.find((t) => t.displayName.toLowerCase().includes(q)) ??
    tables.find((t) => t.name.toLowerCase().includes(q))
  )
}

/**
 * Execute an agent command and return a response.
 */
export async function executeCommand(
  command: AgentCommand,
): Promise<{ response: string; action?: () => void }> {
  const store = useAppStore.getState()
  const { tables, relationships, setFlyToTarget, setSelectedTable } = store

  switch (command.type) {
    case 'navigate': {
      const table = findTable(tables, command.target)
      if (!table) {
        return { response: `I couldn't find a table matching "${command.target}". Try searching for a specific table name.` }
      }
      return {
        response: `Flying to **${table.displayName}** (${formatRecordCount(table.recordCount)} records) in the ${table.domain} district.`,
        action: () => {
          setSelectedTable(table.id)
          setFlyToTarget({
            position: [table.position[0], table.position[1] + 8, table.position[2] + 15],
            lookAt: table.position,
          })
        },
      }
    }

    case 'describe': {
      const table = findTable(tables, command.target)
      if (!table) {
        return { response: `I couldn't find "${command.target}" in your Dataverse. The tables I know about are: ${tables.map((t) => t.displayName).join(', ')}.` }
      }
      const cols = table.columns.slice(0, 8).map((c) => `- **${c.displayName}** (${c.dataType})`).join('\n')
      const relCount = relationships.filter(
        (r) => r.sourceTableId === table.id || r.targetTableId === table.id,
      ).length
      return {
        response: `## ${table.displayName}\n\n**Domain:** ${table.domain} | **Records:** ${formatRecordCount(table.recordCount)} | **Relationships:** ${relCount}\n\n**Key Columns:**\n${cols}`,
        action: () => {
          setSelectedTable(table.id)
          setFlyToTarget({
            position: [table.position[0], table.position[1] + 8, table.position[2] + 15],
            lookAt: table.position,
          })
        },
      }
    }

    case 'relate': {
      const t1 = findTable(tables, command.table1)
      const t2 = findTable(tables, command.table2)
      if (!t1 || !t2) {
        return { response: `I couldn't find one or both tables: "${command.table1}" and "${command.table2}".` }
      }
      const directRel = relationships.find(
        (r) =>
          (r.sourceTableId === t1.id && r.targetTableId === t2.id) ||
          (r.sourceTableId === t2.id && r.targetTableId === t1.id),
      )
      if (directRel) {
        return {
          response: `**${t1.displayName}** and **${t2.displayName}** are directly connected via a **${directRel.type}** relationship. Look for the glowing beam connecting them.`,
          action: () => setSelectedTable(t1.id),
        }
      }
      // Check indirect via shared table
      const t1Rels = new Set(relationships.filter((r) => r.sourceTableId === t1.id || r.targetTableId === t1.id).flatMap((r) => [r.sourceTableId, r.targetTableId]))
      const t2Rels = new Set(relationships.filter((r) => r.sourceTableId === t2.id || r.targetTableId === t2.id).flatMap((r) => [r.sourceTableId, r.targetTableId]))
      const shared = [...t1Rels].filter((id) => t2Rels.has(id) && id !== t1.id && id !== t2.id)
      if (shared.length > 0) {
        const sharedNames = shared.map((id) => tables.find((t) => t.id === id)?.displayName).filter(Boolean)
        return { response: `**${t1.displayName}** and **${t2.displayName}** are not directly related, but they share connections through: ${sharedNames.join(', ')}.` }
      }
      return { response: `**${t1.displayName}** and **${t2.displayName}** don't appear to have a direct or indirect relationship in your Dataverse.` }
    }

    case 'tour': {
      const domains = ['Core', 'Sales', 'Service', 'Marketing', 'Finance', 'Custom']
      const highlights = domains
        .map((d) => {
          const count = tables.filter((t) => t.domain === d).length
          return count > 0 ? `**${d}**: ${count} tables` : null
        })
        .filter(Boolean)

      return {
        response: `Welcome to your Dataverse! Here's an overview:\n\n${highlights.join('\n')}\n\n**Total:** ${tables.length} tables with ${relationships.length} relationships.\n\nYour data is organized by domain — Core entities at the center, with Sales, Service, Marketing, Finance, and Custom zones radiating outward. Click any platform to inspect it, or ask me to describe a specific table.`,
        action: () => {
          setSelectedTable(null)
          setFlyToTarget({
            position: [0, 30, 50],
            lookAt: [0, 0, 0],
          })
        },
      }
    }

    case 'analyze': {
      const query = command.query.toLowerCase()
      if (query.includes('most records') || query.includes('largest')) {
        const sorted = [...tables].sort((a, b) => b.recordCount - a.recordCount)
        const top3 = sorted.slice(0, 3)
        return {
          response: `The tables with the most records:\n\n${top3.map((t, i) => `${i + 1}. **${t.displayName}** — ${formatRecordCount(t.recordCount)} records`).join('\n')}`,
          action: () => {
            setSelectedTable(top3[0].id)
            setFlyToTarget({
              position: [top3[0].position[0], top3[0].position[1] + 8, top3[0].position[2] + 15],
              lookAt: top3[0].position,
            })
          },
        }
      }
      if (query.includes('most relationship') || query.includes('most connected')) {
        const relCounts = new Map<string, number>()
        for (const r of relationships) {
          relCounts.set(r.sourceTableId, (relCounts.get(r.sourceTableId) ?? 0) + 1)
          relCounts.set(r.targetTableId, (relCounts.get(r.targetTableId) ?? 0) + 1)
        }
        const sorted = [...relCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3)
        return {
          response: `The most connected tables:\n\n${sorted.map(([id, count], i) => `${i + 1}. **${tables.find((t) => t.id === id)?.displayName ?? id}** — ${count} relationships`).join('\n')}`,
        }
      }
      return { response: `I can answer questions about your Dataverse. Try asking:\n- "Which table has the most records?"\n- "Which table is most connected?"\n- "Describe [table name]"\n- "How is [table] related to [table]?"` }
    }

    case 'create': {
      return {
        response: `I'd love to help you build that! The vibe coding engine can create apps right here in your Dataverse.\n\n> Creating: "${command.description}"\n\nThis feature is being materialized... Watch the 3D space for the new portal gateway to appear.`,
      }
    }

    case 'sync': {
      const syncFn = (window as any).__dveSyncTables
      if (!syncFn) {
        return { response: 'Sync is not available in demo mode. Deploy to a Power Apps environment to enable live sync.' }
      }
      const currentCount = tables.length
      return {
        response: `Starting Dataverse sync... I'll scan for new tables beyond the ${currentCount} already loaded. Watch the progress bar at the bottom of the screen.`,
        action: () => {
          syncFn()
        },
      }
    }

    case 'general':
    default: {
      return {
        response: `I'm your Dataverse guide! Here's what I can help with:\n\n- **"Show me [table]"** — Fly to a specific table\n- **"Describe [table]"** — Get table details\n- **"How is [A] related to [B]?"** — Explore relationships\n- **"Give me a tour"** — Overview of your Dataverse\n- **"Which table has the most records?"** — Data insights\n- **"Sync"** — Re-scan Dataverse for new tables\n- **"Create an app for..."** — Vibe coding\n\nWhat would you like to explore?`,
      }
    }
  }
}

/**
 * Process a user message through the agent pipeline.
 */
export async function processAgentMessage(userMessage: string): Promise<string> {
  const store = useAppStore.getState()
  store.setAgentThinking(true)

  // Simulate thinking delay for realism
  await new Promise((resolve) => setTimeout(resolve, 800 + Math.random() * 700))

  const command = parseCommand(userMessage)
  const result = await executeCommand(command)

  // Execute any side effects (camera moves, selections)
  if (result.action) {
    result.action()
  }

  store.setAgentThinking(false)
  return result.response
}
