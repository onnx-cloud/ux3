// src/types.ts - Mermaid diagram AST and type definitions

export interface MermaidDiagram {
  type: DiagramType
  title?: string
  config: DiagramConfig
  nodes: DiagramNode[]
  edges: DiagramEdge[]
  metadata?: Record<string, unknown>
}

export type DiagramType =
  | 'flowchart'
  | 'sequenceDiagram'
  | 'stateDiagram'
  | 'erDiagram'
  | 'classDiagram'
  | 'gantt'

export interface DiagramConfig {
  direction?: 'TB' | 'BT' | 'LR' | 'RL'
  layout?: 'linear' | 'radial' | 'force'
  theme?: 'light' | 'dark' | 'minimal'
  fontSize?: number
  padding?: number
  showIds?: boolean
}

export interface DiagramNode {
  id: string
  label: string
  shape?: NodeShape
  style?: Record<string, unknown>
  metadata?: Record<string, unknown>
}

export type NodeShape =
  | 'rect'
  | 'circle'
  | 'diamond'
  | 'parallelogram'
  | 'cylinder'
  | 'hexagon'
  | 'cloud'

export interface DiagramEdge {
  source: string
  target: string
  label?: string
  style?: 'solid' | 'dashed' | 'dotted'
  guard?: string
}

export interface LayoutPosition {
  x: number
  y: number
  width: number
  height: number
}

export interface LayoutResult {
  nodes: Map<string, LayoutPosition>
  edges: Array<{ source: string; target: string; path: Point[] }>
}

export interface Point {
  x: number
  y: number
}

export interface Theme {
  primary: string
  secondary: string
  tertiary: string
  text: string
  textOnPrimary: string
  border: string
  borderWidth: number
  borderRadius: number
  fontSize: number
  fontFamily: string
  spacing: number
}

export interface DiagnosticMessage {
  level: 'error' | 'warning' | 'info'
  message: string
}

export type Token =
  | { type: 'keyword'; value: string }
  | { type: 'identifier'; value: string }
  | { type: 'string'; value: string }
  | { type: 'arrow'; value: string }
  | { type: 'operator'; value: string }
  | { type: 'bracket'; value: string }
  | { type: 'comment'; value: string }
  | { type: 'config'; value: string }
  | { type: 'whitespace'; value: string }
