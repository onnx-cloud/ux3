// src/index.ts - Plugin entry point

import DiagramsPlugin from './markdown-integration.js'
import { UxDiagram } from './diagram-element.js'

export { MermaidParser } from './parser.js'
export { LayeredLayout, ForceDirectedLayout } from './layout.js'
export { MermaidRenderer } from './renderer.js'
export { THEMES, getTheme, registerTheme } from './theme.js'
export { renderMermaidDiagram, DiagramsPlugin } from './markdown-integration.js'
export { UxDiagram, UxDiagramUx3 } from './diagram-element.js'
export type * from './types.js'

export default DiagramsPlugin
