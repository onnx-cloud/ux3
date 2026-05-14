// src/diagram-utils.ts - Shared renderer helpers for Mermaid diagram sources

import { MermaidParser } from './parser.js'
import { LayeredLayout, ForceDirectedLayout } from './layout.js'
import { MermaidRenderer } from './renderer.js'
import { getTheme } from './theme.js'
import type { MermaidDiagram } from './types.js'

export interface RenderResult {
  fragment: DocumentFragment
  diagram?: MermaidDiagram
}

export function renderDiagramSource(source: string, themeName?: string): RenderResult {
  const fragment = document.createDocumentFragment()

  try {
    const parser = new MermaidParser()
    const diagram = parser.parse(source)

    const layout =
      diagram.type === 'flowchart' || diagram.type === 'stateDiagram'
        ? new LayeredLayout().compute(diagram, diagram.config)
        : new ForceDirectedLayout().compute(diagram, diagram.config)

    const selectedTheme = diagram.config.theme || themeName || 'light'
    const theme = getTheme(selectedTheme)

    const renderer = new MermaidRenderer(theme)
    const svg = renderer.render(diagram, layout)

    const container = document.createElement('div')
    container.className = 'diagram-container'
    container.setAttribute('data-diagram-type', diagram.type)
    container.appendChild(svg)

    fragment.appendChild(container)
    return { fragment, diagram }
  } catch (error) {
    const errorDiv = document.createElement('div')
    errorDiv.className = 'diagram-error'
    errorDiv.textContent = `Diagram parsing error: ${(error as Error).message}`
    fragment.appendChild(errorDiv)
    return { fragment }
  }
}
