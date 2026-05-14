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
    this.skipNonSemantic()
    const token = this.peek()
    if (token?.type !== 'keyword') {
      throw new SyntaxError(`Expected diagram type, got ${token?.value}`)
    }
    this.advance()
    return token.value
  }

  private parseFlowchart(): MermaidDiagram {
    const config = this.parseConfig()
    this.skipNonSemantic()

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
      this.skipNonSemantic()
      if (this.pos >= this.tokens.length) break

      const lineEdges = this.tryParseFlowchartEdges()
      if (!lineEdges.length) {
        this.advance()
        continue
      }

      for (const edge of lineEdges) {
        edges.push(edge)

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
    }

    return {
      type: 'flowchart',
      config,
      nodes,
      edges,
    }
  }

  private tryParseEdge(): DiagramEdge | null {
    const lineEdges = this.tryParseFlowchartEdges()
    return lineEdges.length === 1 ? lineEdges[0] : null
  }

  private tryParseFlowchartEdges(): DiagramEdge[] {
    const startPos = this.pos
    const edges: DiagramEdge[] = []
    let currentNode = this.parseNodeReference()
    if (!currentNode) {
      this.pos = startPos
      return []
    }

    this.skipNonSemantic()

    while (this.peek()?.type === 'arrow') {
      const arrowToken = this.advance()
      this.skipNonSemantic()

      let label: string | undefined
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
        this.skipNonSemantic()
      }

      const nextNode = this.parseNodeReference()
      if (!nextNode) {
        this.pos = startPos
        return []
      }

      edges.push({
        source: currentNode.id,
        target: nextNode.id,
        label,
        style: arrowToken.value.includes('-.-') ? 'dashed' : 'solid',
      })

      currentNode = nextNode
      this.skipNonSemantic()
    }

    if (edges.length === 0) {
      this.pos = startPos
      return []
    }

    return edges
  }

  private parseSequenceDiagram(): MermaidDiagram {
    const config = this.parseConfig()
    const nodes: DiagramNode[] = []
    const edges: DiagramEdge[] = []

    while (this.pos < this.tokens.length) {
      this.skipNonSemantic()
      const token = this.peek()
      if (!token) break

      if (token.type === 'keyword') {
        if (token.value === 'participant') {
          this.advance()
          this.skipNonSemantic()
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
        } else {
          this.advance()
        }
      } else if (token.type === 'identifier') {
        const startPos = this.pos
        const sourceRef = this.parseNodeReference()
        if (!sourceRef) {
          this.pos = startPos
          this.advance()
          continue
        }

        this.skipNonSemantic()
        const arrowToken = this.peek()
        if (!arrowToken || arrowToken.type !== 'arrow') {
          this.pos = startPos
          this.advance()
          continue
        }

        this.advance()
        this.skipNonSemantic()

        const targetRef = this.parseNodeReference()
        if (!targetRef) {
          this.pos = startPos
          this.advance()
          continue
        }

        let label: string | undefined
        if (this.peek()?.value === ':') {
          this.advance()
          const labelTokens: string[] = []
          while (this.peek() && this.peek()?.type !== 'newline') {
            labelTokens.push(this.peek()!.value)
            this.advance()
          }
          label = labelTokens.join(' ').trim() || undefined
        }

        edges.push({
          source: sourceRef.id,
          target: targetRef.id,
          label,
          style: arrowToken.value.includes('-.-') ? 'dashed' : 'solid',
        })

        if (!nodes.some((n) => n.id === sourceRef.id)) {
          nodes.push({ id: sourceRef.id, label: sourceRef.label || sourceRef.id, shape: 'rect' })
        }

        if (!nodes.some((n) => n.id === targetRef.id)) {
          nodes.push({ id: targetRef.id, label: targetRef.label || targetRef.id, shape: 'rect' })
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
      this.skipNonSemantic()
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
    const startPos = this.pos
    this.skipNonSemantic()

    const sourceRef = this.parseNodeReference()
    if (!sourceRef) {
      this.pos = startPos
      return null
    }

    const arrowToken = this.peek()
    if (!arrowToken || arrowToken.type !== 'arrow') {
      this.pos = startPos
      return null
    }

    this.advance()
    this.skipNonSemantic()

    const targetRef = this.parseNodeReference()
    if (!targetRef) {
      this.pos = startPos
      return null
    }

    let label: string | undefined
    if (this.peek()?.value === ':') {
      this.advance()
      const labelTokens: string[] = []
      while (this.peek() && this.peek()?.type !== 'newline') {
        labelTokens.push(this.peek()!.value)
        this.advance()
      }
      label = labelTokens.join(' ').trim() || undefined
    }

    return {
      source: sourceRef.id,
      target: targetRef.id,
      label,
      guard: label,
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
    this.skipNonSemantic()

    while (this.peek()?.type === 'config') {
      const configToken = this.advance()
      try {
        const jsonStr = configToken.value.slice(2, -1) // remove %% { and }
        const parsed = JSON.parse('{' + jsonStr + '}')
        Object.assign(config, parsed)
      } catch {
        // ignore malformed config
      }
      this.skipNonSemantic()
    }

    return config
  }

  private parseNodeReference(): { id: string; label?: string } | null {
    this.skipNonSemantic()
    const token = this.peek()
    if (!token || token.type !== 'identifier') return null

    const id = token.value
    this.advance()
    this.skipNonSemantic()

    let label: string | undefined
    if (this.peek()?.type === 'bracket' && this.peek()?.value === '[') {
      this.advance()
      const labelTokens: string[] = []
      while (this.peek() && !(this.peek()?.type === 'bracket' && this.peek()?.value === ']')) {
        labelTokens.push(this.peek()!.value)
        this.advance()
      }
      if (this.peek()?.type === 'bracket' && this.peek()?.value === ']') {
        this.advance()
      }
      label = labelTokens.join('').trim() || undefined
    }

    return { id, label }
  }

  private skipNonSemantic(): void {
    while (
      this.peek()?.type === 'whitespace' ||
      this.peek()?.type === 'newline' ||
      this.peek()?.type === 'comment'
    ) {
      this.advance()
    }
  }

  private peek(): Token | undefined {
    return this.tokens[this.pos]
  }

  private advance(): Token | undefined {
    return this.tokens[this.pos++]
  }
}
