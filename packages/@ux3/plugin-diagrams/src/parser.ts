// src/parser.ts - Recursive descent parser for Mermaid DSL

import { tokenize } from './tokenizer.js'
import type { MermaidDiagram, DiagramConfig, DiagramNode, DiagramEdge, Token } from './types.js'

export class MermaidParser {
  private tokens: Token[] = []
  private pos = 0

  parse(text: string): MermaidDiagram {
    this.tokens = tokenize(text)
    this.pos = 0

    const diagramType = this.parseDirective()

    switch (diagramType) {
      case 'flowchart':
      case 'graph':
        return this.parseFlowchart()
      case 'sequenceDiagram':
        return this.parseSequenceDiagram()
      case 'stateDiagram':
      case 'stateDiagram-v2':
        return this.parseStateDiagram()
      case 'erDiagram':
        return this.parseErDiagram()
      case 'classDiagram':
        return this.parseClassDiagram()
      case 'gantt':
        return this.parseGantt()
      default:
        throw new SyntaxError(`Unknown diagram type: ${diagramType}`)
    }
  }

  private parseDirective(): string {
    const token = this.peek()
    if (token?.type !== 'keyword') {
      throw new SyntaxError(`Expected diagram type, got ${token?.value}`)
    }
    this.advance()
    return token.value
  }

  private parseFlowchart(): MermaidDiagram {
    const config = this.parseConfig()

    // Direction (optional)
    const dirToken = this.peek()
    if (dirToken?.type === 'keyword' && ['TD', 'BT', 'LR', 'RL'].includes(dirToken.value)) {
      config.direction = dirToken.value as any
      this.advance()
    }

    const nodes: DiagramNode[] = []
    const edges: DiagramEdge[] = []
    const nodeMap = new Map<string, DiagramNode>()

    while (this.pos < this.tokens.length) {
      const edge = this.tryParseEdge()
      if (!edge) {
        this.advance()
        continue
      }

      edges.push(edge)

      // Ensure nodes exist
      if (!nodeMap.has(edge.source)) {
        const node: DiagramNode = { id: edge.source, label: edge.source, shape: 'rect' }
        nodes.push(node)
        nodeMap.set(edge.source, node)
      }

      if (!nodeMap.has(edge.target)) {
        const node: DiagramNode = { id: edge.target, label: edge.target, shape: 'rect' }
        nodes.push(node)
        nodeMap.set(edge.target, node)
      }
    }

    return {
      type: 'flowchart',
      config,
      nodes,
      edges,
    }
  }

  private tryParseEdge(): DiagramEdge | null {
    const sourceToken = this.peek()
    if (!sourceToken || sourceToken.type !== 'identifier') return null

    const source = sourceToken.value
    this.advance()

    const arrowToken = this.peek()
    if (!arrowToken || arrowToken.type !== 'arrow') {
      this.pos-- // backtrack
      return null
    }

    this.advance()

    let label = ''
    if (this.peek()?.type === 'operator' && this.peek()?.value === '|') {
      this.advance() // consume |
      const labelTokens: string[] = []
      while (this.peek()?.value !== '|' && this.pos < this.tokens.length) {
        const t = this.peek()
        if (t) labelTokens.push(t.value)
        this.advance()
      }
      if (this.peek()?.value === '|') this.advance() // consume closing |
      label = labelTokens.join('')
    }

    const targetToken = this.peek()
    if (!targetToken || targetToken.type !== 'identifier') {
      return null
    }

    const target = targetToken.value
    this.advance()

    return {
      source,
      target,
      label: label || undefined,
      style: arrowToken.value.includes('-.-') ? 'dashed' : 'solid',
    }
  }

  private parseSequenceDiagram(): MermaidDiagram {
    const config = this.parseConfig()
    const nodes: DiagramNode[] = []
    const edges: DiagramEdge[] = []

    while (this.pos < this.tokens.length) {
      const token = this.peek()
      if (!token) break

      if (token.type === 'keyword') {
        if (token.value === 'participant') {
          this.advance()
          const nameToken = this.peek()
          if (nameToken?.type === 'identifier') {
            nodes.push({
              id: nameToken.value,
              label: nameToken.value,
              shape: 'rect',
            })
            this.advance()
          }
        } else if (token.value === 'autonumber') {
          this.advance()
        }
      } else {
        this.advance()
      }
    }

    return {
      type: 'sequenceDiagram',
      config,
      nodes,
      edges,
    }
  }

  private parseStateDiagram(): MermaidDiagram {
    const config = this.parseConfig()
    const nodes: DiagramNode[] = []
    const edges: DiagramEdge[] = []
    const nodeMap = new Map<string, DiagramNode>()

    // Add implicit initial and final states
    nodes.push({ id: '[*]', label: '', shape: 'circle' })
    nodeMap.set('[*]', nodes[0])

    while (this.pos < this.tokens.length) {
      const edge = this.tryParseStateEdge()
      if (!edge) {
        this.advance()
        continue
      }

      edges.push(edge)

      // Ensure nodes exist
      if (!nodeMap.has(edge.source)) {
        const node: DiagramNode = { id: edge.source, label: edge.source, shape: 'rect' }
        nodes.push(node)
        nodeMap.set(edge.source, node)
      }

      if (!nodeMap.has(edge.target)) {
        const node: DiagramNode = { id: edge.target, label: edge.target, shape: 'rect' }
        nodes.push(node)
        nodeMap.set(edge.target, node)
      }
    }

    return {
      type: 'stateDiagram',
      config,
      nodes,
      edges,
    }
  }

  private tryParseStateEdge(): DiagramEdge | null {
    const sourceToken = this.peek()
    if (!sourceToken || sourceToken.type !== 'identifier') return null

    const source = sourceToken.value
    this.advance()

    const arrowToken = this.peek()
    if (!arrowToken || arrowToken.type !== 'arrow') {
      this.pos--
      return null
    }

    this.advance()

    let label = ''
    if (this.peek()?.type === 'operator' && this.peek()?.value === ':') {
      this.advance()
      const labelTokens: string[] = []
      while (this.peek()?.value !== ':' && this.pos < this.tokens.length) {
        const t = this.peek()
        if (t) labelTokens.push(t.value)
        this.advance()
      }
      label = labelTokens.join('')
    }

    const targetToken = this.peek()
    if (!targetToken || targetToken.type !== 'identifier') {
      return null
    }

    const target = targetToken.value
    this.advance()

    return {
      source,
      target,
      label: label || undefined,
      guard: label || undefined,
    }
  }

  private parseErDiagram(): MermaidDiagram {
    const config = this.parseConfig()
    return { type: 'erDiagram', config, nodes: [], edges: [] }
  }

  private parseClassDiagram(): MermaidDiagram {
    const config = this.parseConfig()
    return { type: 'classDiagram', config, nodes: [], edges: [] }
  }

  private parseGantt(): MermaidDiagram {
    const config = this.parseConfig()
    return { type: 'gantt', config, nodes: [], edges: [] }
  }

  private parseConfig(): DiagramConfig {
    const config: DiagramConfig = {}

    while (this.peek()?.type === 'config') {
      const configToken = this.advance()
      try {
        const jsonStr = configToken.value.slice(2, -1) // remove %% { and }
        const parsed = JSON.parse('{' + jsonStr + '}')
        Object.assign(config, parsed)
      } catch {
        // ignore malformed config
      }
    }

    return config
  }

  private peek(): Token | undefined {
    return this.tokens[this.pos]
  }

  private advance(): Token | undefined {
    return this.tokens[this.pos++]
  }
}
