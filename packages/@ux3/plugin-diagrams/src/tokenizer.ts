// src/tokenizer.ts - Regex-based tokenizer for Mermaid DSL

import type { Token } from './types.js'

export function tokenize(text: string): Token[] {
  const lines = text.split('\n')
  const tokens: Token[] = []

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('%%')) continue

    const lineTokens = scanLine(trimmed)
    tokens.push(...lineTokens)
  }

  return tokens.filter((t) => t.type !== 'whitespace')
}

function scanLine(line: string): Token[] {
  const tokens: Token[] = []
  let col = 0

  while (col < line.length) {
    const rest = line.slice(col)

    // Comments
    if (rest.startsWith('%%')) {
      tokens.push({ type: 'comment', value: rest })
      break
    }

    // Config block
    if (rest.match(/^%%\s*\{/)) {
      const endIdx = rest.indexOf('}')
      if (endIdx !== -1) {
        tokens.push({
          type: 'config',
          value: rest.slice(0, endIdx + 1),
        })
        col += endIdx + 1
        continue
      }
    }

    // Strings (quoted)
    if (rest.match(/^["']/)) {
      const quote = rest[0]
      let i = 1
      while (i < rest.length && rest[i] !== quote) {
        if (rest[i] === '\\') i++
        i++
      }
      tokens.push({
        type: 'string',
        value: rest.slice(0, i + 1),
      })
      col += i + 1
      continue
    }

    // Keywords and identifiers
    if (rest.match(/^[a-zA-Z_]/)) {
      const match = rest.match(/^[a-zA-Z_][a-zA-Z0-9_]*/)
      if (match) {
        const value = match[0]
        const keyword = isKeyword(value)
        tokens.push({
          type: keyword ? 'keyword' : 'identifier',
          value,
        })
        col += value.length
        continue
      }
    }

    // Arrows
    if (rest.match(/^(--[x]?>|o--[o]?->|-\.-[x]?>|-->|--)/)) {
      const match = rest.match(/^(--[x]?>|o--[o]?->|-\.-[x]?>|-->|--)+/)
      if (match) {
        tokens.push({
          type: 'arrow',
          value: match[0],
        })
        col += match[0].length
        continue
      }
    }

    // Operators and special chars
    if (rest.match(/^[|;:{}()\[\]<>=]/)) {
      tokens.push({
        type: rest[0] === '|' ? 'operator' : 'bracket',
        value: rest[0],
      })
      col++
      continue
    }

    // Whitespace
    if (rest.match(/^\s+/)) {
      const match = rest.match(/^\s+/)
      if (match) {
        tokens.push({
          type: 'whitespace',
          value: match[0],
        })
        col += match[0].length
        continue
      }
    }

    // Numbers
    if (rest.match(/^\d+/)) {
      const match = rest.match(/^\d+(\.\d+)?/)
      if (match) {
        tokens.push({
          type: 'identifier',
          value: match[0],
        })
        col += match[0].length
        continue
      }
    }

    // Unknown character, skip
    col++
  }

  return tokens
}

function isKeyword(word: string): boolean {
  const keywords = new Set([
    'flowchart',
    'graph',
    'sequenceDiagram',
    'stateDiagram',
    'stateDiagram-v2',
    'erDiagram',
    'classDiagram',
    'gantt',
    'subgraph',
    'end',
    'TD',
    'BT',
    'LR',
    'RL',
    'direction',
    'config',
    'actor',
    'participant',
    'note',
    'loop',
    'alt',
    'else',
    'opt',
    'break',
    'par',
    'seq',
    'strict',
    'neg',
    'critical',
    'assert',
    'ignore',
    'consider',
    'autonumber',
  ])

  return keywords.has(word)
}
