import { describe, expect, it } from 'vitest'
import { toCsv } from './csv'

describe('toCsv', () => {
  it('creates CSV rows with escaping', () => {
    const csv = toCsv([
      { id: 1, title: 'Mock session', notes: 'line one\nline two' },
      { id: 2, title: '"Quoted" title', notes: 'none' },
    ])

    expect(csv).toContain('id,title,notes')
    expect(csv).toContain('"line one\nline two"')
    expect(csv).toContain('"""Quoted"" title"')
  })
})
