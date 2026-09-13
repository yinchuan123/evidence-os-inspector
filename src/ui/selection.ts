/**
 * Read the current text selection as character offsets inside `container`.
 * The container must render its text with `white-space: pre-wrap` and contain
 * only inline elements (e.g. <mark>) so that Range.toString() length equals
 * the string offset in the original text.
 */
export function selectionOffsets(container: HTMLElement): { start: number; end: number } | null {
  const sel = window.getSelection()
  if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return null
  const range = sel.getRangeAt(0)
  if (!container.contains(range.startContainer) || !container.contains(range.endContainer)) return null
  const pre = document.createRange()
  pre.selectNodeContents(container)
  pre.setEnd(range.startContainer, range.startOffset)
  const start = pre.toString().length
  const end = start + range.toString().length
  if (end <= start) return null
  return { start, end }
}
