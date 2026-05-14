// src/renderer.ts - SVG renderer for diagrams

import type { MermaidDiagram, LayoutResult, LayoutPosition, Point, Theme, DiagramNode } from './types.js'

export class MermaidRenderer {
  private theme: Theme

  constructor(theme: Theme) {
    this.theme = theme
  }

  render(diagram: MermaidDiagram, layout: LayoutResult): SVGElement {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')

    const bounds = this.computeBounds(layout)
    const width = Math.max(bounds.width + 80, 300)
    const height = Math.max(bounds.height + 80, 200)

    svg.setAttribute('width', String(width))
    svg.setAttribute('height', String(height))
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`)
    svg.setAttribute('class', 'mermaid-diagram-svg')

    // Background
    const bg = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
    bg.setAttribute('width', String(width))
    bg.setAttribute('height', String(height))
    bg.setAttribute('fill', this.theme.tertiary)
    svg.appendChild(bg)

    // Defs for markers
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs')
    this.addArrowMarker(defs, 'arrow-solid')
    this.addArrowMarker(defs, 'arrow-dashed', true)
    svg.appendChild(defs)

    // Render edges first (behind nodes)
    this.renderEdges(diagram, layout, svg)

    // Render nodes
    this.renderNodes(diagram, layout, svg)

    return svg
  }

  private renderNodes(
    diagram: MermaidDiagram,
    layout: LayoutResult,
    parent: SVGElement,
  ): void {
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g')
    g.setAttribute('class', 'nodes')

    for (const node of diagram.nodes) {
      const pos = layout.nodes.get(node.id)
      if (!pos) continue

      const nodeGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g')
      nodeGroup.setAttribute('class', `node node-${node.shape || 'rect'}`)
      nodeGroup.setAttribute('data-id', node.id)

      // Shape
      const shape = this.createShape(node, pos)
      nodeGroup.appendChild(shape)

      // Label
      if (node.label) {
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text')
        text.setAttribute('x', String(pos.x + pos.width / 2))
        text.setAttribute('y', String(pos.y + pos.height / 2 + 2))
        text.setAttribute('text-anchor', 'middle')
        text.setAttribute('dominant-baseline', 'middle')
        text.setAttribute('xml:space', 'preserve')
        text.setAttribute('class', 'node-label')
        text.setAttribute('style', `font-size: ${Math.max(this.theme.fontSize - 1, 12)}px; font-family: ${this.theme.fontFamily}; white-space: pre;`)
        text.textContent = node.label
        nodeGroup.appendChild(text)
      }

      g.appendChild(nodeGroup)
    }

    parent.appendChild(g)
  }

  private createShape(node: DiagramNode, pos: LayoutPosition): SVGElement {
    const shape = node.shape || 'rect'

    switch (shape) {
      case 'circle':
        return this.createCircle(pos)
      case 'diamond':
        return this.createDiamond(pos)
      case 'parallelogram':
        return this.createParallelogram(pos)
      case 'cylinder':
        return this.createCylinder(pos)
      case 'rect':
      default:
        return this.createRect(pos)
    }
  }

  private createRect(pos: LayoutPosition): SVGRectElement {
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
    const rx = this.theme.borderRadius
    rect.setAttribute('x', String(pos.x))
    rect.setAttribute('y', String(pos.y))
    rect.setAttribute('width', String(pos.width))
    rect.setAttribute('height', String(pos.height))
    rect.setAttribute('rx', String(rx))
    rect.setAttribute('ry', String(rx))
    rect.setAttribute('class', 'node-shape')
    rect.setAttribute(
      'style',
      `fill: ${this.theme.primary}; stroke: ${this.theme.border}; stroke-width: ${this.theme.borderWidth};`,
    )
    return rect
  }

  private createCircle(pos: LayoutPosition): SVGCircleElement {
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle')
    const r = Math.min(pos.width, pos.height) / 2
    circle.setAttribute('cx', String(pos.x + pos.width / 2))
    circle.setAttribute('cy', String(pos.y + pos.height / 2))
    circle.setAttribute('r', String(r))
    circle.setAttribute('class', 'node-shape')
    circle.setAttribute(
      'style',
      `fill: ${this.theme.primary}; stroke: ${this.theme.border}; stroke-width: ${this.theme.borderWidth};`,
    )
    return circle
  }

  private createDiamond(pos: LayoutPosition): SVGPathElement {
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
    const cx = pos.x + pos.width / 2
    const cy = pos.y + pos.height / 2
    const w = pos.width / 2
    const h = pos.height / 2

    const points = [
      `M ${cx} ${cy - h}`,
      `L ${cx + w} ${cy}`,
      `L ${cx} ${cy + h}`,
      `L ${cx - w} ${cy}`,
      'Z',
    ]
    path.setAttribute('d', points.join(' '))
    path.setAttribute('class', 'node-shape')
    path.setAttribute(
      'style',
      `fill: ${this.theme.primary}; stroke: ${this.theme.border}; stroke-width: ${this.theme.borderWidth};`,
    )
    return path
  }

  private createParallelogram(pos: LayoutPosition): SVGPathElement {
    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
    const offset = 15

    const points = [
      `M ${pos.x + offset} ${pos.y}`,
      `L ${pos.x + pos.width} ${pos.y}`,
      `L ${pos.x + pos.width - offset} ${pos.y + pos.height}`,
      `L ${pos.x} ${pos.y + pos.height}`,
      'Z',
    ]
    path.setAttribute('d', points.join(' '))
    path.setAttribute('class', 'node-shape')
    path.setAttribute(
      'style',
      `fill: ${this.theme.primary}; stroke: ${this.theme.border}; stroke-width: ${this.theme.borderWidth};`,
    )
    return path
  }

  private createCylinder(pos: LayoutPosition): SVGElement {
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g')
    const style = `fill: ${this.theme.primary}; stroke: ${this.theme.border}; stroke-width: ${this.theme.borderWidth};`

    // Top ellipse
    const top = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse')
    top.setAttribute('cx', String(pos.x + pos.width / 2))
    top.setAttribute('cy', String(pos.y + 10))
    top.setAttribute('rx', String(pos.width / 2))
    top.setAttribute('ry', String(10))
    top.setAttribute('class', 'node-shape')
    top.setAttribute('style', style)

    // Body rectangle
    const body = document.createElementNS('http://www.w3.org/2000/svg', 'rect')
    body.setAttribute('x', String(pos.x))
    body.setAttribute('y', String(pos.y + 10))
    body.setAttribute('width', String(pos.width))
    body.setAttribute('height', String(pos.height - 20))
    body.setAttribute('class', 'node-shape')
    body.setAttribute('style', style)

    // Bottom ellipse
    const bottom = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse')
    bottom.setAttribute('cx', String(pos.x + pos.width / 2))
    bottom.setAttribute('cy', String(pos.y + pos.height - 10))
    bottom.setAttribute('rx', String(pos.width / 2))
    bottom.setAttribute('ry', String(10))
    bottom.setAttribute('class', 'node-shape')
    bottom.setAttribute('style', style)

    g.appendChild(top)
    g.appendChild(body)
    g.appendChild(bottom)
    return g
  }

  private renderEdges(diagram: MermaidDiagram, layout: LayoutResult, parent: SVGElement): void {
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g')
    g.setAttribute('class', 'edges')

    for (const edge of diagram.edges) {
      const edgePath = layout.edges.find((e) => e.source === edge.source && e.target === edge.target)
      if (!edgePath) continue

      const edgeGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g')
      edgeGroup.setAttribute('class', 'edge')

      // Path
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
      const d = this.pathToD(edgePath.path)
      path.setAttribute('d', d)
      path.setAttribute('class', `edge-line edge-${edge.style || 'solid'}`)
      path.setAttribute(
        'style',
        `stroke: ${this.theme.secondary}; stroke-width: 2; fill: none; ${edge.style === 'dashed' ? 'stroke-dasharray: 5, 5;' : ''}`,
      )

      const markerId = edge.style === 'dashed' ? 'arrow-dashed' : 'arrow-solid'
      path.setAttribute('marker-end', `url(#${markerId})`)

      edgeGroup.appendChild(path)

      // Label (if present)
      if (edge.label) {
        const labelPos = this.computeLabelPosition(edgePath.path)
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text')
        text.setAttribute('x', String(labelPos.x))
        text.setAttribute('y', String(labelPos.y))
        text.setAttribute('class', 'edge-label')
        text.setAttribute('text-anchor', 'middle')
        text.setAttribute('dy', '-5')
        text.setAttribute('style', `font-size: ${this.theme.fontSize - 2}px; font-family: ${this.theme.fontFamily}; fill: ${this.theme.text};`)
        text.textContent = edge.label
        edgeGroup.appendChild(text)
      }

      g.appendChild(edgeGroup)
    }

    parent.appendChild(g)
  }

  private pathToD(points: Point[]): string {
    if (points.length === 0) return ''
    const segments = []
    for (let i = 0; i < points.length; i++) {
      const p = points[i]
      segments.push(`${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`)
    }
    return segments.join(' ')
  }

  private addArrowMarker(defs: SVGDefsElement, id: string, dashed = false): void {
    const marker = document.createElementNS('http://www.w3.org/2000/svg', 'marker')
    marker.setAttribute('id', id)
    marker.setAttribute('markerWidth', '10')
    marker.setAttribute('markerHeight', '10')
    marker.setAttribute('refX', '8')
    marker.setAttribute('refY', '3')
    marker.setAttribute('orient', 'auto')

    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path')
    path.setAttribute('d', 'M 0 0 L 10 3 L 0 6 Z')
    path.setAttribute('fill', this.theme.secondary)
    marker.appendChild(path)

    defs.appendChild(marker)
  }

  private computeLabelPosition(points: Point[]): Point {
    if (points.length < 2) return points[0]
    const mid = Math.floor(points.length / 2)
    return points[mid]
  }

  private computeBounds(layout: LayoutResult): { width: number; height: number } {
    let maxX = 0,
      maxY = 0
    for (const pos of layout.nodes.values()) {
      maxX = Math.max(maxX, pos.x + pos.width)
      maxY = Math.max(maxY, pos.y + pos.height)
    }
    return { width: maxX, height: maxY }
  }
}
