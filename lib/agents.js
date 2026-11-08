// dsh-cost-meter — subagent and multi-agent hierarchical cost attribution (Issue #127).
// Tracks agentId, role, and subagentName from DSH session event metadata.

/**
 * Extracts agent attribution metadata from a DSH event.
 * Handles event.data, event.metadata, event.data.agent, event.data.chunk.
 */
export function extractAgentMeta(event) {
  if (!event) return { agentId: 'root', role: 'root', subagentName: 'Root Agent' }
  const data = event.data || {}
  const meta = event.metadata || {}
  const chunk = data.chunk || {}
  const agentObj = (typeof data.agent === 'object' && data.agent !== null)
    ? data.agent
    : ((typeof meta.agent === 'object' && meta.agent !== null) ? meta.agent : {})

  const rawId = data.agentId || meta.agentId || chunk.agentId || agentObj.id || data.subagentId || meta.subagentId || 'root'
  const agentId = String(rawId).trim() || 'root'

  const rawRole = data.role || meta.role || agentObj.role || data.subagentRole || (agentId === 'root' ? 'root' : 'subagent')
  const role = String(rawRole).trim() || 'subagent'

  const rawName = data.subagentName || data.agentName || agentObj.name || meta.subagentName || (agentId === 'root' ? 'Root Agent' : (agentId.charAt(0).toUpperCase() + agentId.slice(1)))
  const subagentName = String(rawName).trim()

  return { agentId, role, subagentName }
}

/**
 * Groups session spend and tokens hierarchically by agentId.
 * Preserves total session cost integrity by prorating or normalizing sum of agent costs.
 */
export function getAgentsSpendReport(turns = [], totalSessionCostUsd = 0, currency = '$', usdRate = 1) {
  const fx = Number(usdRate) > 0 ? Number(usdRate) : 1
  const sessionTotal = Number(totalSessionCostUsd) > 0 ? Number(totalSessionCostUsd) : 0

  if (!Array.isArray(turns) || turns.length === 0) {
    return {
      agents: [],
      hasSubagents: false,
      topSpender: null,
      totalCostUsd: sessionTotal,
      totalCostLocal: sessionTotal * fx,
      totalTokens: 0,
      turnCount: 0,
    }
  }

  const byAgent = new Map()

  for (let i = 0; i < turns.length; i++) {
    const t = turns[i]
    if (!t) continue

    const id = String(t.agentId || 'root').trim() || 'root'
    const role = String(t.role || (id === 'root' ? 'root' : 'subagent')).trim()
    const name = String(t.subagentName || (id === 'root' ? 'Root Agent' : id)).trim()

    const uncached = Number(t.uncachedInputTokens) || 0
    const cached = Number(t.cacheReadTokens) || 0
    const out = Number(t.outputTokens) || 0
    const write = Number(t.cacheWriteTokens) || 0
    const reasoning = Number(t.reasoningTokens) || 0
    const tok = uncached + cached + out + write || Number(t.tokens) || 0
    const cost = Number(t.costDeltaUsd) || 0

    if (!byAgent.has(id)) {
      byAgent.set(id, {
        agentId: id,
        role,
        name,
        tokens: 0,
        uncachedInputTokens: 0,
        outputTokens: 0,
        cacheReadTokens: 0,
        cacheWriteTokens: 0,
        reasoningTokens: 0,
        rawCostUsd: 0,
        turnCount: 0,
        isRoot: id === 'root',
      })
    }

    const entry = byAgent.get(id)
    entry.tokens += tok
    entry.uncachedInputTokens += uncached
    entry.outputTokens += out
    entry.cacheReadTokens += cached
    entry.cacheWriteTokens += write
    entry.reasoningTokens += reasoning
    entry.rawCostUsd += cost
    entry.turnCount += 1
  }

  const totalTok = Array.from(byAgent.values()).reduce((acc, a) => acc + a.tokens, 0)
  const sumRawCost = Array.from(byAgent.values()).reduce((acc, a) => acc + a.rawCostUsd, 0)

  // Preserving total session cost integrity
  const effectiveTotalUsd = sessionTotal > 0 ? sessionTotal : sumRawCost

  const agentsList = Array.from(byAgent.values()).map((entry) => {
    let costUsd = 0
    if (sessionTotal > 0) {
      if (sumRawCost > 0) {
        costUsd = (entry.rawCostUsd / sumRawCost) * sessionTotal
      } else if (totalTok > 0) {
        costUsd = (entry.tokens / totalTok) * sessionTotal
      }
    } else {
      costUsd = entry.rawCostUsd
    }

    const pct = effectiveTotalUsd > 0
      ? Number(((costUsd / effectiveTotalUsd) * 100).toFixed(1))
      : (totalTok > 0 ? Number(((entry.tokens / totalTok) * 100).toFixed(1)) : 0)

    return {
      agentId: entry.agentId,
      name: entry.name,
      role: entry.role,
      isRoot: entry.isRoot,
      tokens: entry.tokens,
      uncachedInputTokens: entry.uncachedInputTokens,
      outputTokens: entry.outputTokens,
      cacheReadTokens: entry.cacheReadTokens,
      cacheWriteTokens: entry.cacheWriteTokens,
      reasoningTokens: entry.reasoningTokens,
      costUsd: Number(costUsd.toFixed(4)),
      costLocal: Number((costUsd * fx).toFixed(4)),
      percentage: pct,
      turnCount: entry.turnCount,
    }
  })

  // Sort: root first, then highest cost / tokens descending
  agentsList.sort((a, b) => {
    if (a.isRoot && !b.isRoot) return -1
    if (!a.isRoot && b.isRoot) return 1
    return b.costUsd - a.costUsd || b.tokens - a.tokens
  })

  // Find top spender among non-root (or overall if only root exists)
  const nonRoot = agentsList.filter((a) => !a.isRoot)
  const topSpender = nonRoot.length > 0
    ? nonRoot.reduce((max, a) => (a.costUsd > max.costUsd || (a.costUsd === max.costUsd && a.tokens > max.tokens) ? a : max), nonRoot[0])
    : (agentsList.length > 0 ? agentsList[0] : null)

  const hasSubagents = agentsList.length > 1 || (agentsList.length === 1 && !agentsList[0].isRoot)

  return {
    agents: agentsList,
    hasSubagents,
    topSpender: topSpender ? { agentId: topSpender.agentId, name: topSpender.name, role: topSpender.role, costUsd: topSpender.costUsd, percentage: topSpender.percentage } : null,
    totalCostUsd: Number(effectiveTotalUsd.toFixed(4)),
    totalCostLocal: Number((effectiveTotalUsd * fx).toFixed(4)),
    totalTokens: totalTok,
    turnCount: turns.length,
  }
}
