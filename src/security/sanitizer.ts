/**
 * HTML and text sanitization to prevent XSS attacks
 * Follows OWASP Top 10 #3: Injection prevention
 */

type SanitizationLevel = 'strict' | 'moderate' | 'relaxed';

interface SanitizationOptions {
  level: SanitizationLevel;
  allowedTags?: string[];
  allowedAttrs?: string[];
}

const DEFAULT_ALLOWED_TAGS = [
  'p', 'br', 'strong', 'em', 'u', 'i', 'b', 'span',
  'a', 'ul', 'ol', 'li', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'
];

const DEFAULT_ALLOWED_ATTRS = [
  'class', 'id', 'href', 'title', 'data-*'
];

const DANGEROUS_ATTRS = [
  'onclick', 'onload', 'onerror', 'onmouseover', 'onmouseout',
  'onkeydown', 'onkeyup', 'onchange', 'ondblclick', 'onfocus',
  'onblur', 'onwheel', 'onscroll', 'onpointerdown', 'onpointermove',
  'onpointerup', 'ontouchstart', 'ontouchmove', 'ontouchend'
];

const DANGEROUS_TAGS = [
  'script', 'iframe', 'object', 'embed', 'frame', 'frameset',
  'meta', 'link', 'style'
];

/**
 * Escapes HTML special characters to prevent XSS
 */
export function escapeHtml(text: string): string {
  if (typeof text !== 'string') return String(text);
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Sanitizes HTML input by removing dangerous tags and attributes
 */
export function sanitizeHtml(
  html: string,
  options: Partial<SanitizationOptions> = {}
): string {
  const {
    level = 'moderate',
    allowedTags = DEFAULT_ALLOWED_TAGS,
    allowedAttrs = DEFAULT_ALLOWED_ATTRS
  } = options;

  if (level === 'strict') {
    // Strip all HTML, return text only
    return stripHtml(html);
  }

  // Use DOMParser in the browser-like environment if available
  if (typeof DOMParser !== 'undefined') {
    try {
      // Wrap in a safe container to avoid document structure issues
      const wrappedHtml = `<div>${html}</div>`;
      const parser = new DOMParser();
      const doc = parser.parseFromString(wrappedHtml, 'text/html');

      if (!doc.body) return '';

      // Get the wrapper div
      const wrapper = doc.body.querySelector('div');
      if (!wrapper) return '';

      // Remove dangerous elements
      DANGEROUS_TAGS.forEach(tag => {
        wrapper.querySelectorAll(tag).forEach(el => el.remove());
      });

      // Process all remaining elements
      wrapper.querySelectorAll('*').forEach(el => {
        const tagName = el.tagName.toLowerCase();
        
        // Remove elements not in allowlist
        if (!allowedTags.includes(tagName)) {
          const parent = el.parentNode;
          if (parent) {
            while (el.firstChild) {
              parent.insertBefore(el.firstChild, el);
            }
            parent.removeChild(el);
          }
          return;
        }

        // Remove dangerous attributes
        Array.from(el.attributes).forEach(attr => {
          const attrName = attr.name.toLowerCase();
          
          if (DANGEROUS_ATTRS.includes(attrName)) {
            el.removeAttribute(attr.name);
            return;
        }

        // Check against allowlist
        const isAllowed = allowedAttrs.some(allowed => {
          if (allowed.endsWith('*')) {
            return attrName.startsWith(allowed.slice(0, -1));
          }
          return attrName === allowed;
        });

        if (!isAllowed) {
          el.removeAttribute(attr.name);
        }
      });

      // Validate href for XSS (javascript: protocol)
      if (el.tagName.toLowerCase() === 'a') {
        const href = el.getAttribute('href');
        if (href && (href.startsWith('javascript:') || href.startsWith('data:'))) {
          el.removeAttribute('href');
        }
      }
      });

      return wrapper.innerHTML;
    } catch (error) {
      // If DOMParser fails, fall through to fallback
      console.warn('[UX3] Sanitization fallback due to:', error);
    }
  }

  // Fallback server-side sanitization (basic but safe): remove scripts and dangerous attributes
  let out = String(html);

  // Remove dangerous elements entirely
  DANGEROUS_TAGS.forEach(tag => {
    out = out.replace(new RegExp(`<${tag}[\s\S]*?<\/${tag}>`, 'gi'), '');
    out = out.replace(new RegExp(`<${tag}[^>]*\/?>`, 'gi'), '');
  });

  // Remove dangerous attributes like onclick="..." (broad catch-all for on* handlers)
  out = out.replace(/\s(on\w+)\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '');

  // Also sanitize specific dangerous attributes as a fallback
  DANGEROUS_ATTRS.forEach(attr => {
    out = out.replace(new RegExp(`\\s${attr}\\s*=\\s*(\"[^\"]*\"|'[^']*'|[^\\s>]+)`, 'gi'), '');
  });

  // Remove javascript: or data: hrefs
  out = out.replace(/href\s*=\s*("|')?(javascript:|data:)[^"'\s>]*\1?/gi, '');

  return out;
}

/**
 * Strips all HTML tags, returns plain text
 */
export function stripHtml(html: string): string {
  // Lightweight server-safe implementation
  return String(html).replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
}

/**
 * Validates and sanitizes URL to prevent XSS via protocol handlers
 */
export function sanitizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    
    // Only allow http, https, mailto, tel
    const allowed = ['http:', 'https:', 'mailto:', 'tel:', 'ftp:'];
    if (!allowed.includes(parsed.protocol)) {
      return '';
    }

    return url;
  } catch {
    // Invalid URL
    return '';
  }
}

/**
 * Sanitizes data attributes to prevent XSS through JSON injection
 */
export function sanitizeJson(json: unknown): unknown {
  if (typeof json !== 'object' || json === null) {
    return json;
  }

  if (Array.isArray(json)) {
    return json.map(item => sanitizeJson(item));
  }

  const sanitized: Record<string, unknown> = Object.create(null);
  
  for (const [key, value] of Object.entries(json)) {
    // Validate key to prevent prototype pollution
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
      continue;
    }

    if (typeof value === 'string') {
      sanitized[key] = escapeHtml(value);
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeJson(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * CSP (Content Security Policy) header generator
 */
export interface CSPConfig {
  defaultSrc?: string[];
  scriptSrc?: string[];
  styleSrc?: string[];
  imgSrc?: string[];
  connectSrc?: string[];
  fontSrc?: string[];
  frameSrc?: string[];
  objectSrc?: string[];
}

export function generateCSP(config: CSPConfig): string {
  const directives: string[] = [];

  if (config.defaultSrc) {
    directives.push(`default-src ${config.defaultSrc.join(' ')}`);
  }
  if (config.scriptSrc) {
    directives.push(`script-src ${config.scriptSrc.join(' ')}`);
  }
  if (config.styleSrc) {
    directives.push(`style-src ${config.styleSrc.join(' ')}`);
  }
  if (config.imgSrc) {
    directives.push(`img-src ${config.imgSrc.join(' ')}`);
  }
  if (config.connectSrc) {
    directives.push(`connect-src ${config.connectSrc.join(' ')}`);
  }
  if (config.fontSrc) {
    directives.push(`font-src ${config.fontSrc.join(' ')}`);
  }
  if (config.frameSrc) {
    directives.push(`frame-src ${config.frameSrc.join(' ')}`);
  }
  if (config.objectSrc) {
    directives.push(`object-src ${config.objectSrc.join(' ')}`);
  }

  return directives.join('; ');
}
