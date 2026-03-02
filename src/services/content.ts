// Convenience re-exports for the content plugin and service types
import { ContentPlugin } from './content-plugin.js';
export { ContentPlugin };

// Type definitions for runtime consumers
export interface ContentItem {
  file: string;
  slug: string;
  frontmatter: Record<string, any>;
  html: string;
}

export interface ContentManifest {
  items: ContentItem[];
}

export interface ContentService {
  load: (args: { entry: string }) => Promise<{ html: string; frontmatter: any } | null>;
}

export default ContentPlugin;
