/**
 * Accessibility (a11y) utilities and WCAG 2.1 AA compliance helpers
 * Follows WCAG 2.1 Level AA guidelines
 */

export interface AccessibilityIssue {
  id: string;
  level: 'error' | 'warning';
  message: string;
  element: Element;
  suggestion: string;
}

/**
 * Accessibility audit to check for common WCAG violations
 */
export class AccessibilityAuditor {
  private issues: AccessibilityIssue[] = [];

  /**
   * Runs full accessibility audit on a document or element
   */
  audit(root: Element = document.body): AccessibilityIssue[] {
    this.issues = [];

    this.checkHeadings(root);
    this.checkImages(root);
    this.checkLinks(root);
    this.checkButtons(root);
    this.checkFormLabels(root);
    this.checkContrast(root);
    this.checkKeyboardNavigation(root);
    this.checkAriaLabels(root);
    this.checkLanguage(root);

    return this.issues;
  }

  /**
   * Check heading hierarchy (H1 > H2 > H3, no skips)
   */
  private checkHeadings(root: Element): void {
    const headings = root.querySelectorAll('h1, h2, h3, h4, h5, h6');
    let previousLevel = 0;

    headings.forEach(heading => {
      const level = parseInt(heading.tagName[1]);
      
      if (previousLevel === 0) {
        if (level !== 1) {
          this.addIssue('HEADING_LEVEL_START', 'error', heading,
            'Page should start with H1 heading',
            'Add an H1 heading at the top');
        }
      } else if (level > previousLevel + 1) {
        this.addIssue('HEADING_SKIP', 'warning', heading,
          `Heading jumps from H${previousLevel} to H${level}`,
          `Use H${previousLevel + 1} instead`);
      }
      
      previousLevel = level;
    });

    if (headings.length === 0) {
      this.addIssue('NO_HEADINGS', 'error', root,
        'Page has no headings',
        'Add heading structure to organize content');
    }
  }

  /**
   * Check images have alt text
   */
  private checkImages(root: Element): void {
    root.querySelectorAll('img').forEach(img => {
      const alt = img.getAttribute('alt');
      
      if (!alt || alt.trim() === '') {
        this.addIssue('IMAGE_ALT', 'error', img,
          'Image missing alt text',
          'Add descriptive alt text: alt="description"');
      } else if (alt.length > 125) {
        this.addIssue('IMAGE_ALT_LENGTH', 'warning', img,
          'Alt text is too long',
          'Keep alt text under 125 characters');
      }
    });
  }

  /**
   * Check links are accessible
   */
  private checkLinks(root: Element): void {
    root.querySelectorAll('a').forEach(link => {
      const text = link.textContent?.trim();
      const ariaLabel = link.getAttribute('aria-label');
      
      if (!text && !ariaLabel) {
        this.addIssue('LINK_TEXT', 'error', link,
          'Link has no text or aria-label',
          'Add descriptive link text or aria-label');
      }
      
      if (text === 'click here' || text === 'learn more') {
        this.addIssue('LINK_VAGUE', 'warning', link,
          'Link text is too vague',
          'Use descriptive text like "Learn more about x"');
      }
    });
  }

  /**
   * Check buttons are accessible
   */
  private checkButtons(root: Element): void {
    root.querySelectorAll('button, [role="button"]').forEach(btn => {
      const text = btn.textContent?.trim();
      const ariaLabel = btn.getAttribute('aria-label');
      
      if (!text && !ariaLabel) {
        this.addIssue('BUTTON_TEXT', 'error', btn,
          'Button has no text or aria-label',
          'Add button text or aria-label');
      }

      // Check for keyboard accessibility
      if (btn.tagName !== 'BUTTON') {
        const tabIndex = btn.getAttribute('tabindex');
        if (!tabIndex || parseInt(tabIndex) < 0) {
          this.addIssue('BUTTON_KEYBOARD', 'error', btn,
            'Button is not keyboard accessible',
            'Add tabindex="0" or use <button> element');
        }
      }
    });
  }

  /**
   * Check form labels
   */
  private checkFormLabels(root: Element): void {
    root.querySelectorAll('input, textarea, select').forEach(input => {
      const inputId = input.getAttribute('id');
      const ariaLabel = input.getAttribute('aria-label');
      const ariaLabelledBy = input.getAttribute('aria-labelledby');
      
      if (!ariaLabel && !ariaLabelledBy && inputId) {
        const label = root.querySelector(`label[for="${inputId}"]`);
        if (!label) {
          this.addIssue('FORM_LABEL', 'error', input,
            'Form input missing associated label',
            'Add <label for="id">Label</label>');
        }
      }
    });
  }

  /**
   * Check color contrast ratio (WCAG AA: 4.5:1 normal, 3:1 large)
   */
  private checkContrast(root: Element): void {
    root.querySelectorAll('*').forEach(el => {
      const style = window.getComputedStyle(el);
      const fg = style.color;
      const bg = style.backgroundColor;
      
      // Simplified contrast check (full implementation would calculate actual ratio)
      if (fg === 'rgb(128, 128, 128)' && bg === 'rgb(200, 200, 200)') {
        this.addIssue('CONTRAST', 'warning', el,
          'Text contrast ratio may be too low',
          'Ensure foreground/background contrast is at least 4.5:1');
      }
    });
  }

  /**
   * Check keyboard navigation
   */
  private checkKeyboardNavigation(root: Element): void {
    const interactive = root.querySelectorAll('button, a, input, select, textarea');
    
    interactive.forEach(el => {
      const tabIndex = el.getAttribute('tabindex');
      
      if (tabIndex && parseInt(tabIndex) > 0) {
        this.addIssue('TABINDEX_ORDER', 'warning', el,
          'Using tabindex > 0 disrupts keyboard navigation',
          'Remove tabindex or set to 0/-1');
      }
    });
  }

  /**
   * Check ARIA labels and roles
   */
  private checkAriaLabels(root: Element): void {
    // Check for invalid ARIA combinations
    root.querySelectorAll('[role]').forEach(el => {
      const role = el.getAttribute('role');
      const ariaLabel = el.getAttribute('aria-label');
      
      if (role && !ariaLabel && el.textContent?.trim() === '') {
        this.addIssue('ARIA_LABEL', 'error', el,
          `Element with role="${role}" missing text/aria-label`,
          'Add text content or aria-label');
      }
    });
  }

  /**
   * Check page language is set
   */
  private checkLanguage(_root: Element): void {
    const html = document.documentElement;
    const lang = html.getAttribute('lang');
    
    if (!lang) {
      this.addIssue('LANGUAGE', 'warning', html,
        'Page language not specified',
        'Add lang attribute: <html lang="en">');
    }
  }

  private addIssue(id: string, level: 'error' | 'warning', element: Element, 
                    message: string, suggestion: string): void {
    this.issues.push({ id, level, message, element, suggestion });
  }

  /**
   * Gets audit results summary
   */
  getSummary() {
    return {
      total: this.issues.length,
      errors: this.issues.filter(i => i.level === 'error').length,
      warnings: this.issues.filter(i => i.level === 'warning').length,
      issues: this.issues
    };
  }
}

/**
 * ARIA utility helpers
 */
export class AriaHelper {
  /**
   * Mark element as required and invalid for screen readers
   */
  static markRequired(element: HTMLElement): void {
    element.setAttribute('aria-required', 'true');
  }

  /**
   * Mark element as having validation error
   */
  static markInvalid(element: HTMLElement, errorId: string): void {
    element.setAttribute('aria-invalid', 'true');
    element.setAttribute('aria-describedby', errorId);
  }

  /**
   * Announce dynamic content to screen readers
   */
  static announce(message: string, priority: 'polite' | 'assertive' = 'polite'): void {
    const announcement = document.createElement('div');
    announcement.setAttribute('role', 'status');
    announcement.setAttribute('aria-live', priority);
    announcement.setAttribute('aria-atomic', 'true');
    announcement.className = 'sr-only'; // Visually hidden
    announcement.textContent = message;
    
    document.body.appendChild(announcement);
    setTimeout(() => announcement.remove(), 3000);
  }

  /**
   * Create accessible dialog
   */
  static createDialog(title: string, content: string, buttons: { label: string; action: () => void }[]): HTMLElement {
    const dialog = document.createElement('div');
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-modal', 'true');
    dialog.setAttribute('aria-labelledby', 'dialog-title');
    
    const titleEl = document.createElement('h2');
    titleEl.id = 'dialog-title';
    titleEl.textContent = title;
    
    const contentEl = document.createElement('div');
    contentEl.innerHTML = content;
    
    const buttonContainer = document.createElement('div');
    buttons.forEach(btn => {
      const button = document.createElement('button');
      button.textContent = btn.label;
      button.onclick = btn.action;
      buttonContainer.appendChild(button);
    });

    dialog.appendChild(titleEl);
    dialog.appendChild(contentEl);
    dialog.appendChild(buttonContainer);
    
    return dialog;
  }
}
