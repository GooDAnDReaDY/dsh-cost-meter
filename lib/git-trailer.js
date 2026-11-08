/**
 * Git commit trailer cost attribution (Issue #143)
 * RFC 2822 / Git Trailer compliant formatting and parsing.
 */

function formatTokenCount(num) {
  const n = Number(num) || 0
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M'
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'k'
  return String(n)
}

function parseTokenCount(str) {
  if (!str) return 0
  const s = String(str).trim().toLowerCase()
  if (s.endsWith('m')) return Math.round(parseFloat(s) * 1e6)
  if (s.endsWith('k')) return Math.round(parseFloat(s) * 1e3)
  return parseInt(s, 10) || 0
}

/**
 * Formats cost & token metadata into RFC-compliant Git trailers block.
 */
export function formatGitCommitTrailers(sessionSpend = {}, options = {}) {
  const {
    totalCostUsd = 0,
    currency = '$',
    fx = 1,
    inputTokens = 0,
    outputTokens = 0,
    cacheHitRate = 0,
    model = '',
    provider = '',
  } = sessionSpend

  const effectiveCost = totalCostUsd * fx
  const costFmt = effectiveCost >= 1
    ? (currency + effectiveCost.toFixed(2))
    : (effectiveCost > 0 ? (currency + effectiveCost.toFixed(4)) : (currency + '0.00'))

  const trailers = []
  trailers.push('Token-Cost: ' + costFmt)

  if (inputTokens > 0) {
    trailers.push('Tokens-Input: ' + formatTokenCount(inputTokens))
  }
  if (outputTokens > 0) {
    trailers.push('Tokens-Output: ' + formatTokenCount(outputTokens))
  }
  if (cacheHitRate > 0) {
    trailers.push('Tokens-Cache-Hit: ' + Math.round(cacheHitRate) + '%')
  }

  const modelIdentifier = provider ? (provider + '/' + model) : model
  if (modelIdentifier) {
    trailers.push('Model: ' + modelIdentifier)
  }

  return trailers.join('\n')
}

/**
 * Appends cost trailers to an existing git commit message.
 */
export function appendCostTrailers(commitMessage = '', sessionSpend = {}, options = {}) {
  const msg = String(commitMessage || '').trimEnd()
  const trailers = formatGitCommitTrailers(sessionSpend, options)
  if (!trailers) return msg
  if (!msg) return trailers

  return msg + '\n\n' + trailers + '\n'
}

/**
 * Parses Git trailers from a commit message or git log text.
 */
export function parseGitCommitTrailers(text = '') {
  const str = String(text || '')
  const result = {
    found: false,
    cost: 0,
    costFormatted: '',
    currency: '$',
    inputTokens: 0,
    outputTokens: 0,
    cacheHitRate: 0,
    model: '',
  }

  const costMatch = str.match(/Token-Cost:\s*([^\d\s]?)([\d\.]+)/i)
  if (costMatch) {
    result.found = true
    if (costMatch[1]) result.currency = costMatch[1]
    result.cost = parseFloat(costMatch[2]) || 0
    result.costFormatted = (result.currency || '$') + result.cost
  }

  const inMatch = str.match(/Tokens-Input:\s*([\d\.]+[km]?)/i)
  if (inMatch) {
    result.found = true
    result.inputTokens = parseTokenCount(inMatch[1])
  }

  const outMatch = str.match(/Tokens-Output:\s*([\d\.]+[km]?)/i)
  if (outMatch) {
    result.found = true
    result.outputTokens = parseTokenCount(outMatch[1])
  }

  const hitMatch = str.match(/Tokens-Cache-Hit:\s*([\d\.]+)%/i)
  if (hitMatch) {
    result.found = true
    result.cacheHitRate = parseFloat(hitMatch[1]) || 0
  }

  const modelMatch = str.match(/Model:\s*([^\r\n]+)/i)
  if (modelMatch) {
    result.found = true
    result.model = modelMatch[1].trim()
  }

  return result
}
