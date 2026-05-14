// src/diagram-element.ts - Custom element for rendering diagrams

import { renderDiagramSource } from './diagram-utils.js'
import type { MermaidDiagram } from './types.js'
import { LifecycleComponent } from '../../../../src/ui/lifecycle-component.js'

const UX3_DIAGRAMS: Record<string, string> = {
  fsm: `stateDiagram-v2
  [*] --> idle
  idle --> loading : submit
  loading --> ready : success
  loading --> error : failure
  error --> idle : retry`,
  route: `flowchart LR
  router[Router] --> route[Route]
  route --> view[View]
  view --> state[App \nState]
  router --> store[Storage]`,
  plan: `flowchart LR
  user[User] --> intent[Intent]
  intent --> planner[Planner]
  planner --> action[Action]
  action --> result[Result]
  result --> user`,
  ux: `graph LR
  ux3[UX3 Framework] --> plugins[Plugins]
  plugins --> markdown[Markdown]
  plugins --> diagrams[Diagrams]
  markdown --> render[Render]
  diagrams --> svg[SVG Output]`,
  app: `graph LR
  ux3[UX3 App] --> router[Router]
  ux3 --> state[App State]
  ux3 --> plugins[Plugins]
  plugins --> ui[UI]
  plugins --> services[Services]`,
}

export class UxDiagram extends LifecycleComponent {
  private rendered = false
  private source = ''

  static {
    if (!customElements.get('ux-diagram')) {
      customElements.define('ux-diagram', UxDiagram)
    }
    if (!customElements.get('ux-diagram-ux3')) {
      customElements.define('ux-diagram-ux3', UxDiagram)
    }
  }

  protected onConnected(): void {
    this.source = this.getAttribute('data-source') || this.textContent || ''

    if (!this.source.trim()) return

    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && !this.rendered) {
          this.renderDiagram()
          observer.disconnect()
        }
      })
      observer.observe(this)
    } else {
      this.renderDiagram()
    }
  }

  private renderDiagram(): void {
    if (this.rendered) return

    const themeName = this.getAttribute('data-theme') || 'light'
    const { fragment, diagram } = renderDiagramSource(this.source, themeName)

    this.innerHTML = ''
    this.appendChild(fragment)
    this.rendered = true

    if (diagram) {
      this.dispatchEvent(new CustomEvent('ux:diagram.rendered', { detail: { diagram } }))
    }
  }
}

export class UxDiagramUx3 extends LifecycleComponent {
  private rendered = false

  static {
    if (!customElements.get('ux-diagram-ux3')) {
      customElements.define('ux-diagram-ux3', UxDiagramUx3)
    }
  }

  protected onConnected(): void {
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver((entries) => {
        if (entries[0].isIntersecting && !this.rendered) {
          this.renderDiagram()
          observer.disconnect()
        }
      })
      observer.observe(this)
    } else {
      this.renderDiagram()
    }
  }

  private renderDiagram(): void {
    if (this.rendered) return

    const type = (this.getAttribute('type') || 'ux').toLowerCase()
    const source = UX3_DIAGRAMS[type]

    if (!source) {
      this.renderError(`Unknown diagram type: ${type}`)
      return
    }

    const themeName = this.getAttribute('data-theme') || 'light'
    const { fragment } = renderDiagramSource(source, themeName)

    this.innerHTML = ''
    this.appendChild(fragment)
    this.rendered = true
  }

  private renderError(message: string): void {
    const errorDiv = document.createElement('div')
    errorDiv.className = 'diagram-error'
    errorDiv.textContent = message
    this.innerHTML = ''
    this.appendChild(errorDiv)
  }
}
