// src/diagram-element.ts - Custom element for rendering diagrams

import { MermaidParser } from './parser.js'
import { LayeredLayout, ForceDirectedLayout } from './layout.js'
import { MermaidRenderer } from './renderer.js'
import { getTheme } from './theme.js'

export class UxDiagram extends HTMLElement {
  private rendered = false
  private source = ''

  static {
    if (!customElements.get('ux-diagram')) {
      customElements.define('ux-diagram', UxDiagram)
    }
  }

  connectedCallback(): void {
    this.source = this.getAttribute('data-source') || this.textContent || ''

    if (!this.source.trim()) return

    // Use IntersectionObserver for lazy rendering
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && !this.rendered) {
          this.renderDiagram()
          observer.disconnect()
        }
      })
      observer.observe(this)
    } else {
      // Fallback: render immediately
      this.renderDiagram()
    }
  }

  private renderDiagram(): void {
    if (this.rendered) return

    try {
      // Parse diagram
      const parser = new MermaidParser()
      const diagram = parser.parse(this.source)

      // Choose layout based on type
      let layout
      if (diagram.type === 'flowchart') {
        layout = new LayeredLayout().compute(diagram, diagram.config)
      } else if (diagram.type === 'stateDiagram') {
        layout = new LayeredLayout().compute(diagram, diagram.config)
      } else {
        // Force-directed for sequence, ER, etc.
        layout = new ForceDirectedLayout().compute(diagram, diagram.config)
      }

      // Get theme
      const themeName = diagram.config.theme || this.getAttribute('data-theme') || 'light'
      const theme = getTheme(themeName)

      // Render
      const renderer = new MermaidRenderer(theme)
      const svg = renderer.render(diagram, layout)

      // Clear and append
      this.innerHTML = ''
      this.appendChild(svg)

      this.rendered = true
      this.dispatchEvent(new CustomEvent('ux:diagram-rendered', { detail: { diagram } }))
    } catch (e) {
      this.renderError((e as Error).message)
    }
  }

  private renderError(message: string): void {
    const errorDiv = document.createElement('div')
    errorDiv.className = 'diagram-error'
    errorDiv.textContent = `Diagram error: ${message}`
    this.innerHTML = ''
    this.appendChild(errorDiv)
  }
}
