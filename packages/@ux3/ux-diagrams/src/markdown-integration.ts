// src/markdown-integration.ts - Hooks into markdown renderer for automatic diagram rendering

import type { Plugin, AppContext } from '../../../../src/plugin/registry'
import { renderDiagramSource } from './diagram-utils.js'
import { UxDiagram } from './diagram-element.js'

/**
 * Hook to inject into markdown renderer's code block handler.
 * Called when a code block with language 'mermaid' is encountered.
 */
export function renderMermaidDiagram(code: string, themeName?: string): DocumentFragment | null {
  return renderDiagramSource(code, themeName).fragment
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
