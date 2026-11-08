/**
 * Smart auto-compaction and middle-truncation for oversized tool outputs (Issue #154)
 * Protects agent context from runaway token inflation while preserving critical diagnostics.
 */

/**
 * Heuristic token estimation: ~4 chars per token for typical code / CLI output.
 */
export function estimateOutputTokens(text) {
  if (!text) return 0
  return Math.ceil(String(text).length / 4)
}

/**
 * Smart middle-truncation that keeps headLines (commands/context) and tailLines (results/errors)
 * while safely compacting the bloated middle section.
 */
export function smartMiddleTruncate(output, options = {}) {
  const text = String(output || '')
  if (!text) {
    return {
      text: '',
      truncated: false,
      originalChars: 0,
      truncatedChars: 0,
      originalTokens: 0,
      savedTokens: 0,
      headLinesCount: 0,
      tailLinesCount: 0,
    }
  }

  const maxTokens = Math.max(10, Math.floor(Number(options?.maxTokens) || 10000))
  const maxChars = maxTokens * 4
  const headLines = Math.max(1, Math.floor(Number(options?.headLines) || 200))
  const tailLines = Math.max(1, Math.floor(Number(options?.tailLines) || 100))

  const originalChars = text.length
  const originalTokens = estimateOutputTokens(text)

  // If text is below character and token threshold, no truncation needed
  if (originalChars <= maxChars && originalTokens <= maxTokens) {
    return {
      text,
      truncated: false,
      originalChars,
      truncatedChars: 0,
      originalTokens,
      savedTokens: 0,
      headLinesCount: text.split('\n').length,
      tailLinesCount: 0,
    }
  }

  const lines = text.split('\n')
  if (lines.length <= headLines + tailLines) {
    return {
      text,
      truncated: false,
      originalChars,
      truncatedChars: 0,
      originalTokens,
      savedTokens: 0,
      headLinesCount: lines.length,
      tailLinesCount: 0,
    }
  }

  const head = lines.slice(0, headLines).join('\n')
  const tail = lines.slice(-tailLines).join('\n')
  const droppedLinesCount = lines.length - headLines - tailLines

  const droppedCharsApprox = originalChars - (head.length + tail.length)
  const truncatedTokens = Math.max(0, Math.ceil(droppedCharsApprox / 4))

  const separator = [
    '',
    `[... ${truncatedTokens.toLocaleString()} tokens (${droppedLinesCount} lines) truncated by Cost Meter to preserve session budget. Head: ${headLines} lines, Tail: ${tailLines} lines ...]`,
    '',
  ].join('\n')

  const truncatedText = head + separator + tail
  const savedTokens = Math.max(0, originalTokens - estimateOutputTokens(truncatedText))

  return {
    text: truncatedText,
    truncated: true,
    originalChars,
    truncatedChars: droppedCharsApprox,
    originalTokens,
    savedTokens,
    headLinesCount: headLines,
    tailLinesCount: tailLines,
    droppedLinesCount,
  }
}

/**
 * Calculates estimated cost savings achieved by truncating tool outputs.
 */
export function calculateTruncationSavings(savedTokens, tokenPricePerMillion = 0.55) {
  const tokens = Number(savedTokens) || 0
  const rate = Number(tokenPricePerMillion) || 0
  const savedUsd = (tokens / 1e6) * rate
  return {
    savedTokens: tokens,
    savedUsd: Number(savedUsd.toFixed(6)),
    savedUsdFormatted: '$' + (savedUsd >= 0.01 ? savedUsd.toFixed(4) : savedUsd.toFixed(6)),
  }
}
