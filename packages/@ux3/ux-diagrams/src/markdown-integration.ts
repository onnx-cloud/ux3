// src/markdown-integration.ts - Hooks into markdown renderer for automatic diagram rendering

import type { Plugin, AppContext } from '../../../../src/plugin/registry'
import { MermaidParser } from './parser.js'
import { LayeredLayout, ForceDirectedLayout } from './layout.js'
import { MermaidRenderer } from './renderer.js'
import { getTheme } from './theme.js'
import { UxDiagram } from './diagram-element.js'

/**
 * Hook to inject into markdown renderer's code block handler.
 * Called when a code block with language 'mermaid' is encountered.
 */
export function renderMermaidDiagram(code: string, themeName?: string): DocumentFragment | null {
  const fragment = document.createDocumentFragment()

  try {
    // Parse
    const parser = new MermaidParser()
    const diagram = parser.parse(code)

    // Choose layout
    let layout
    if (diagram.type === 'flowchart') {
      layout = new LayeredLayout().compute(diagram, diagram.config)
    } else if (diagram.type === 'stateDiagram') {
      layout = new LayeredLayout().compute(diagram, diagram.config)
    } else {
      layout = new ForceDirectedLayout().compute(diagram, diagram.config)
    }

    // Get theme (prefer diagram config, then param, then light)
    const selectedTheme = diagram.config.theme || themeName || 'light'
    const theme = getTheme(selectedTheme)

    // Render to SVG
    const renderer = new MermaidRenderer(theme)
    const svg = renderer.render(diagram, layout)

    // Wrap in container
    const container = document.createElement('div')
    container.className = 'diagram-container'
    container.setAttribute('data-diagram-type', diagram.type)
    container.appendChild(svg)

    fragment.appendChild(container)
    return fragment
  } catch (e) {
    // Return error div wrapped in fragment
    const errorDiv = document.createElement('div')
    errorDiv.className = 'diagram-error'
    errorDiv.textContent = `Diagram parsing error: ${(e as Error).message}`
    fragment.appendChild(errorDiv)
    return fragment
  }
}

/**
 * Plugin that registers the diagram element and hooks into markdown rendering.
 */
export const DiagramsPlugin: Plugin = {
  name: '@ux3/ux-diagrams',
  version: '0.1.0',
  description: 'Mermaid-lite diagram renderer for UX3 markdown',

  install(app: AppContext) {
    // Register custom element
    if (!customElements.get('ux-diagram')) {
      customElements.define('ux-diagram', UxDiagram)
    }

    // Hook into markdown renderer if available via services
    const markdownService = app.services?.markdown as any
    if (markdownService && typeof markdownService.registerCodeBlockRenderer === 'function') {
      markdownService.registerCodeBlockRenderer('mermaid', (code: string, _lang: string) => {
        return renderMermaidDiagram(code)
      })
    }
  },
}

export default DiagramsPlugin
