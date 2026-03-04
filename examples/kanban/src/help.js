/**
 * Help System Initialization
 * 
 * This script initializes the help popover system for the Kanban app.
 * Each view includes a help button (?) that opens a contextual help popover
 * with markdown content from ux/help/*.md files.
 * 
 * Usage:
 * Include this script in the main layout:
 * <script src="help.js"></script>
 * 
 * Then add help buttons to templates:
 * <div class="help-wrapper">
 *   <button class="help-button" type="button">?</button>
 *   <div class="help-popover" role="dialog">
 *     <div class="help-popover-header">
 *       <h3>Help Title</h3>
 *       <button class="help-close-btn">×</button>
 *     </div>
 *     <div class="help-popover-content">
 *       <ux-markdown ux-src="ux/help/file.md" />
 *     </div>
 *   </div>
 *   <div class="help-overlay"></div>
 * </div>
 */

(function() {
  'use strict';

  /**
   * Initialize help button functionality
   * Attaches event listeners to all help buttons and overlays
   */
  function initializeHelpButtons() {
    const helpButtons = document.querySelectorAll('.help-button');
    
    helpButtons.forEach((button) => {
      const wrapper = button.closest('.help-wrapper');
      if (!wrapper) return;

      const popover = wrapper.querySelector('.help-popover');
      const closeBtn = wrapper.querySelector('.help-close-btn');
      const overlay = wrapper.querySelector('.help-overlay');

      if (!popover) return;

      // Open popover on button click
      button.addEventListener('click', (e) => {
        e.stopPropagation();
        togglePopover(popover, overlay, true);
      });

      // Close popover on close button click
      if (closeBtn) {
        closeBtn.addEventListener('click', () => {
          togglePopover(popover, overlay, false);
        });
      }

      // Close popover on overlay click
      if (overlay) {
        overlay.addEventListener('click', () => {
          togglePopover(popover, overlay, false);
        });
      }

      // Close popover on Escape key
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && popover.classList.contains('show')) {
          togglePopover(popover, overlay, false);
        }
      });

      // Close popover when clicking outside
      document.addEventListener('click', (e) => {
        if (!wrapper.contains(e.target) && popover.classList.contains('show')) {
          togglePopover(popover, overlay, false);
        }
      });
    });
  }

  /**
   * Toggle popover visibility
   * @param {HTMLElement} popover - The popover element
   * @param {HTMLElement} overlay - The overlay element
   * @param {boolean} show - Whether to show or hide
   */
  function togglePopover(popover, overlay, show) {
    if (show) {
      popover.classList.add('show');
      if (overlay) overlay.classList.add('show');
      // Focus first focusable element in popover
      const firstFocusable = popover.querySelector('[tabindex], button, a, input');
      if (firstFocusable) firstFocusable.focus();
    } else {
      popover.classList.remove('show');
      if (overlay) overlay.classList.remove('show');
    }
  }

  /**
   * Close all open popovers
   */
  function closeAllPopovers() {
    document.querySelectorAll('.help-popover.show').forEach((popover) => {
      const wrapper = popover.closest('.help-wrapper');
      const overlay = wrapper?.querySelector('.help-overlay');
      togglePopover(popover, overlay, false);
    });
  }

  /**
   * Track analytics for help usage (optional)
   */
  function trackHelpUsage() {
    const helpButtons = document.querySelectorAll('.help-button');
    
    helpButtons.forEach((button) => {
      button.addEventListener('click', (e) => {
        const wrapper = button.closest('.help-wrapper');
        const popover = wrapper?.querySelector('.help-popover');
        const title = popover?.querySelector('.help-popover-header h3')?.textContent || 'Unknown';
        
        if (typeof window.gtag !== 'undefined') {
          window.gtag('event', 'help_opened', {
            help_topic: title
          });
        }
      });
    });
  }

  /**
   * Make all external help links open in new tab
   */
  function configureHelpLinks() {
    document.addEventListener('click', (e) => {
      if (e.target.tagName === 'A' && e.target.closest('.help-popover-content')) {
        if (e.target.href.startsWith('http')) {
          e.target.target = '_blank';
          e.target.rel = 'noopener noreferrer';
        }
      }
    });
  }

  /**
   * Keyboard shortcuts for help
   */
  function setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      // Pressing '?' opens help (if not in input)
      if (e.key === '?' && !isInputFocused()) {
        const firstHelpButton = document.querySelector('.help-button');
        if (firstHelpButton) {
          firstHelpButton.click();
          e.preventDefault();
        }
      }
    });
  }

  /**
   * Check if an input element is focused
   */
  function isInputFocused() {
    const active = document.activeElement;
    return active.tagName === 'INPUT' || 
           active.tagName === 'TEXTAREA' || 
           active.contentEditable === 'true';
  }

  /**
   * Initialize on DOM ready
   */
  function init() {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', init);
      return;
    }

    initializeHelpButtons();
    configureHelpLinks();
    setupKeyboardShortcuts();
    
    // Optional: Track help usage
    // trackHelpUsage();

    console.log('Help system initialized');
  }

  // Export for testing/external use
  window.HelpSystem = {
    closeAll: closeAllPopovers,
    init: init,
    trackUsage: trackHelpUsage
  };

  // Initialize when script loads
  init();
})();
