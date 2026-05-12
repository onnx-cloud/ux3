// src/layout.ts - Simplified Sugiyama layered layout

import type { MermaidDiagram, DiagramConfig, LayoutResult, LayoutPosition, Point } from './types.js'

export class LayeredLayout {
  compute(diagram: MermaidDiagram, config: DiagramConfig): LayoutResult {
    const nodeIds = diagram.nodes.map((n) => n.id)
    const adjList = this.buildAdjacencyList(diagram.edges)

    // Assign levels
    const levels = this.assignLevels(nodeIds, adjList)

    // Minimize crossings
    const order = this.minimizeCrossings(levels, adjList, nodeIds)

    // Compute positions
    const positions = this.computePositions(order, levels, config)

    // Route edges
    const edgePaths = this.routeEdges(positions, diagram.edges)

    return { nodes: positions, edges: edgePaths }
  }

  private buildAdjacencyList(edges: any[]): Map<string, string[]> {
    const adj = new Map<string, string[]>()
    for (const edge of edges) {
      if (!adj.has(edge.source)) adj.set(edge.source, [])
      adj.get(edge.source)!.push(edge.target)
    }
    return adj
  }

  private assignLevels(nodeIds: string[], adjList: Map<string, string[]>): Map<string, number> {
    const levels = new Map<string, number>()
    const visited = new Set<string>()

    const dfs = (node: string, depth: number): void => {
      if (visited.has(node)) return
      visited.add(node)
      levels.set(node, Math.max(levels.get(node) ?? depth, depth))
      for (const child of adjList.get(node) ?? []) {
        dfs(child, depth + 1)
      }
    }

    for (const nodeId of nodeIds) {
      dfs(nodeId, 0)
    }

    return levels
  }

  private minimizeCrossings(
    levels: Map<string, number>,
    adjList: Map<string, string[]>,
    nodeIds: string[],
  ): Array<string[]> {
    const levelGroups = new Map<number, string[]>()
    for (const nodeId of nodeIds) {
      const level = levels.get(nodeId) ?? 0
      if (!levelGroups.has(level)) levelGroups.set(level, [])
      levelGroups.get(level)!.push(nodeId)
    }

    const maxLevel = Math.max(...Array.from(levelGroups.keys()), 0)
    const order: string[][] = []

    for (let level = 0; level <= maxLevel; level++) {
      const nodes = levelGroups.get(level) ?? []
      nodes.sort((a, b) => a.localeCompare(b))
      order.push(nodes)
    }

    return order
  }

  private computePositions(
    order: Array<string[]>,
    levels: Map<string, number>,
    config: DiagramConfig,
  ): Map<string, LayoutPosition> {
    const positions = new Map<string, LayoutPosition>()
    const padding = config.padding ?? 40
    const fontSize = config.fontSize ?? 14
    const nodeHeight = fontSize + 16
    const nodeWidth = 120

    for (let level = 0; level < order.length; level++) {
      const nodes = order[level]
      const y = level * (nodeHeight + padding)

      for (let i = 0; i < nodes.length; i++) {
        const x = i * (nodeWidth + padding)
        positions.set(nodes[i], { x, y, width: nodeWidth, height: nodeHeight })
      }
    }

    return positions
  }

  private routeEdges(
    positions: Map<string, LayoutPosition>,
    edges: any[],
  ): Array<{ source: string; target: string; path: Point[] }> {
    const result: Array<{ source: string; target: string; path: Point[] }> = []

    for (const edge of edges) {
      const sourcePos = positions.get(edge.source)
      const targetPos = positions.get(edge.target)

      if (!sourcePos || !targetPos) continue

      // Simple orthogonal routing
      const path: Point[] = [
        { x: sourcePos.x + sourcePos.width / 2, y: sourcePos.y + sourcePos.height },
        { x: targetPos.x + targetPos.width / 2, y: targetPos.y },
      ]

      result.push({ source: edge.source, target: edge.target, path })
    }

    return result
  }
}

export class ForceDirectedLayout {
  compute(diagram: MermaidDiagram, config: DiagramConfig, iterations = 30): LayoutResult {
    const positions = this.initializePositions(diagram, config)
    const adjList = this.buildAdjacencyList(diagram.edges)

    for (let iter = 0; iter < iterations; iter++) {
      const forces = this.computeForces(positions, adjList)
      this.updatePositions(positions, forces, 0.1)
    }

    return { nodes: positions, edges: [] }
  }

  private buildAdjacencyList(edges: any[]): Map<string, string[]> {
    const adj = new Map<string, string[]>()
    for (const edge of edges) {
      if (!adj.has(edge.source)) adj.set(edge.source, [])
      adj.get(edge.source)!.push(edge.target)
    }
    return adj
  }

  private initializePositions(
    diagram: MermaidDiagram,
    config: DiagramConfig,
  ): Map<string, LayoutPosition> {
    const positions = new Map<string, LayoutPosition>()
    const w = 800
    const h = 600

    for (let i = 0; i < diagram.nodes.length; i++) {
      const angle = (i / diagram.nodes.length) * Math.PI * 2
      const radius = Math.min(w, h) / 3
      const x = w / 2 + radius * Math.cos(angle)
      const y = h / 2 + radius * Math.sin(angle)

      positions.set(diagram.nodes[i].id, { x, y, width: 100, height: 50 })
    }

    return positions
  }

  private computeForces(
    positions: Map<string, LayoutPosition>,
    adjList: Map<string, string[]>,
  ): Map<string, { dx: number; dy: number }> {
    const forces = new Map<string, { dx: number; dy: number }>()

    for (const [nodeId, pos] of positions) {
      let fx = 0,
        fy = 0

      for (const [otherId, otherPos] of positions) {
        if (nodeId === otherId) continue
        const dx = pos.x - otherPos.x
        const dy = pos.y - otherPos.y
        const dist = Math.sqrt(dx * dx + dy * dy) || 0.1
        const repulsive = 100 / (dist * dist)
        fx += (dx / dist) * repulsive
        fy += (dy / dist) * repulsive
      }

      for (const neighborId of adjList.get(nodeId) ?? []) {
        const neighborPos = positions.get(neighborId)
        if (!neighborPos) continue
        const dx = neighborPos.x - pos.x
        const dy = neighborPos.y - pos.y
        const dist = Math.sqrt(dx * dx + dy * dy) || 0.1
        const attractive = dist * 0.1
        fx += (dx / dist) * attractive
        fy += (dy / dist) * attractive
      }

      forces.set(nodeId, { dx: fx, dy: fy })
    }

    return forces
  }

  private updatePositions(
    positions: Map<string, LayoutPosition>,
    forces: Map<string, { dx: number; dy: number }>,
    damping: number,
  ): void {
    for (const [nodeId, force] of forces) {
      const pos = positions.get(nodeId)
      if (!pos) continue
      const maxMove = 5
      const dx = Math.max(-maxMove, Math.min(maxMove, force.dx * damping))
      const dy = Math.max(-maxMove, Math.min(maxMove, force.dy * damping))
      pos.x += dx
      pos.y += dy
    }
  }
}
