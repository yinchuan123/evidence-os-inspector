import { describe, expect, it } from 'vitest'
import { sha256Hex } from './hash'

describe('sha256Hex', () => {
  it('matches the FIPS 180-4 test vector for "abc"', () => {
    expect(sha256Hex('abc')).toBe(
      'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad',
    )
  })

  it('hashes the empty string to the known digest', () => {
    expect(sha256Hex('')).toBe(
      'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    )
  })

  it('encodes non-ASCII input as UTF-8 before hashing', () => {
    // printf '证据' | shasum -a 256
    expect(sha256Hex('证据')).toBe(
      'd883c636d3f8913e51a7cbbbd649757dccc142d4b4cc9d9a7cae9c2982826c3b',
    )
  })
})
