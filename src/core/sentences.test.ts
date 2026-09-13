import { describe, expect, it } from 'vitest'
import { splitSentences } from './sentences'

describe('splitSentences', () => {
  it('splits English sentences and keeps exact offsets into the original text', () => {
    const text = 'First one. Second one? Third!'
    const parts = splitSentences(text)
    expect(parts.map((p) => p.text)).toEqual(['First one.', 'Second one?', 'Third!'])
    for (const p of parts) expect(text.slice(p.start, p.end)).toBe(p.text)
  })

  it('does not split inside common abbreviations or decimals', () => {
    const parts = splitSentences('Mean age was 65.4 years (e.g. older adults). Follow-up was 1 year.')
    expect(parts).toHaveLength(2)
  })

  it('splits Chinese sentences on full-width terminators', () => {
    const parts = splitSentences('第一句。第二句！第三句？')
    expect(parts.map((p) => p.text)).toEqual(['第一句。', '第二句！', '第三句？'])
  })

  it('treats blank lines as boundaries and drops empty pieces', () => {
    const parts = splitSentences('Line one\n\nLine two without period')
    expect(parts.map((p) => p.text)).toEqual(['Line one', 'Line two without period'])
  })
})
