export interface SentenceSpan {
  start: number
  end: number
  text: string
}

const ABBREVIATIONS = new Set([
  'e.g', 'i.e', 'et al', 'vs', 'cf', 'fig', 'figs', 'no', 'nos', 'dr', 'mr', 'mrs', 'ms', 'prof', 'st', 'jr', 'sr', 'approx', 'ca', 'etc',
])

/**
 * Split text into sentence-like spans with exact offsets into the input.
 * Heuristic only: results are suggestions that the reviewer edits, and every
 * resulting claim starts unreviewed.
 */
export function splitSentences(text: string): SentenceSpan[] {
  const out: SentenceSpan[] = []
  let start = 0
  const push = (end: number) => {
    const raw = text.slice(start, end)
    const leading = raw.length - raw.trimStart().length
    const trimmed = raw.trim()
    if (trimmed.length > 0) out.push({ start: start + leading, end: start + leading + trimmed.length, text: trimmed })
    start = end
  }

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]
    // Paragraph boundary
    if (ch === '\n' && text[i + 1] === '\n') {
      push(i)
      continue
    }
    if (ch === '。' || ch === '！' || ch === '？') {
      push(i + 1)
      continue
    }
    if (ch === '.' || ch === '!' || ch === '?') {
      // Run of terminators (e.g. "?!" or "...")
      let j = i
      while (j + 1 < text.length && '.!?'.includes(text[j + 1])) j++
      const next = text[j + 1]
      const atEnd = j + 1 >= text.length
      if (!atEnd && !/\s/.test(next)) {
        i = j
        continue
      }
      if (ch === '.') {
        // Decimal number: "65.4"
        if (/\d/.test(text[i - 1] ?? '') && /\d/.test(text[i + 1] ?? '')) continue
        // Abbreviation before the period
        const before = text.slice(Math.max(0, i - 8), i)
        const word = before.match(/([A-Za-z][A-Za-z.]*)$/)?.[1]?.toLowerCase()
        if (word && (ABBREVIATIONS.has(word) || (word.length === 1 && word !== 'a' && word !== 'i'))) continue
        // "et al." handled via two-word check
        if (/\bet al$/i.test(before)) continue
        // Next non-space char is lowercase -> probably not a boundary
        const rest = text.slice(j + 1)
        const nextWord = rest.match(/^\s+(\S)/)?.[1]
        if (nextWord && /[a-z]/.test(nextWord)) continue
      }
      push(j + 1)
      i = j
    }
  }
  push(text.length)
  return out
}
