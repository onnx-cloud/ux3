import { describe, it, expect, vi } from 'vitest'
import { DiagramsPlugin, renderMermaidDiagram, MermaidParser } from '@ux3/ux-diagrams'

describe('@ux3/ux-diagrams', () => {
  it('renders a flowchart code block to SVG with nodes and an edge', () => {
    const fragment = renderMermaidDiagram('flowchart TD\nA --> B')
    expect(fragment).not.toBeNull()

    const container = fragment?.querySelector('div.diagram-container')
    expect(container).toBeTruthy()
    expect(container?.querySelector('svg')).toBeTruthy()
    expect(container?.querySelectorAll('g.node').length).toBe(2)
    expect(container?.querySelectorAll('g.edge').length).toBe(1)
  })

  it('parses and renders a state diagram with [*] start marker', () => {
    const fragment = renderMermaidDiagram('stateDiagram-v2\n[*] --> State1')
    expect(fragment).not.toBeNull()

    const svg = fragment?.querySelector('svg')
    expect(svg).toBeTruthy()
    expect(fragment?.querySelectorAll('g.edge').length).toBe(1)
    expect(fragment?.querySelectorAll('g.node').length).toBeGreaterThanOrEqual(2)

    const diagram = new MermaidParser().parse('stateDiagram-v2\n[*] --> State1')
    expect(diagram.type).toBe('stateDiagram')
    expect(diagram.edges[0]).toEqual(expect.objectContaining({ source: '[*]', target: 'State1' }))
  })

  it('parses sequence diagram messages into renderable edges', () => {
    const fragment = renderMermaidDiagram('sequenceDiagram\nAlice->Bob: Hello')
    expect(fragment).not.toBeNull()
    expect(fragment?.querySelectorAll('g.edge').length).toBe(1)
    expect(fragment?.querySelectorAll('g.node').length).toBeGreaterThanOrEqual(2)
  })

  it('renders UX3 canonical FSM pattern as a state diagram', () => {
    const source = `stateDiagram-v2\n  [*] --> idle\n  idle --> loading : submit\n  loading --> ready : success\n  loading --> error : failure\n  error --> idle : retry`
    const fragment = renderMermaidDiagram(source)
    expect(fragment).not.toBeNull()
    expect(fragment?.querySelectorAll('g.edge').length).toBe(5)
    expect(fragment?.querySelectorAll('g.node').length).toBeGreaterThanOrEqual(5)

    const diagram = new MermaidParser().parse(source)
    expect(diagram.type).toBe('stateDiagram')
    expect(diagram.edges.map((edge) => edge.source)).toEqual(['[*]', 'idle', 'loading', 'loading', 'error'])
  })

  it('renders a UX3 lifecycle flowchart using graph LR', () => {
    const fragment = renderMermaidDiagram('graph LR\n  view[View] --> event[Event] --> update[Update] --> render[Render]')
    expect(fragment).not.toBeNull()
    expect(fragment?.querySelectorAll('g.node').length).toBe(4)
    expect(fragment?.querySelectorAll('g.edge').length).toBe(3)
  })

  it('renders a built-in UX3 diagram with ux-diagram-ux3', () => {
    const element = document.createElement('ux-diagram-ux3') as HTMLElement
    element.setAttribute('type', 'fsm')
    element.setAttribute('data-theme', 'light')
    document.body.appendChild(element)

    expect(element.querySelector('svg')).toBeTruthy()
    expect(element.querySelectorAll('g.edge').length).toBeGreaterThanOrEqual(1)
    expect(element.querySelectorAll('g.node').length).toBeGreaterThanOrEqual(2)

    document.body.removeChild(element)
  })

  it('registers the mermaid renderer with markdown service on install', () => {
    const registerCodeBlockRenderer = vi.fn()
    const mockApp = { services: { markdown: { registerCodeBlockRenderer } } }

    DiagramsPlugin.install?.(mockApp as any)
    expect(registerCodeBlockRenderer).toHaveBeenCalledWith('mermaid', expect.any(Function))

    const renderFn = registerCodeBlockRenderer.mock.calls[0][1]
    const fragment = renderFn('flowchart TD\nA --> B', 'mermaid')
    expect(fragment).not.toBeNull()
    expect(fragment?.querySelector('svg')).toBeTruthy()
  })
})
