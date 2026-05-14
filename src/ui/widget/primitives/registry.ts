import type { PrimitiveDefinition } from './types.js';
import { registerWidget } from '../widget-registry.js';
import { UxLink } from './link.js';
import { UxTabs } from './tabs.js';
import { UxAccordion } from './accordion.js';
import { UxSlider } from './slider.js';
import { UxToggle } from './toggle.js';
import { UxInput } from './input.js';
import { UxTextarea } from './textarea.js';
import { UxSelect } from './select.js';
import { UxForm } from './form.js';
import { UxMenu } from './menu.js';
import { UxPagination } from './pagination.js';
import { UxBreadcrumb } from './breadcrumb.js';
import { UxCommandPalette } from './command-palette.js';
import { UxWizard } from './wizard.js';
import { UxPopover } from './popover.js';
import { UxTooltip } from './tooltip.js';
import { UxDrawer } from './drawer.js';
import { UxCapture } from './capture.js';
import { UxProgress } from './progress.js';
import { UxImage, UxVideo, UxAudio } from './media.js';
import { UxWysiwyg } from './wysiwyg.js';
import { UxLangSwitcher, UxThemeToggle, UxThemeSwitch, UxNetworkStatus } from '../shell/context-tools.js';
import { UxCard } from './card.js';
import { UxAlert } from './alert.js';
import { UxSpinner } from './spinner.js';
import { UxEmptyState } from './empty-state.js';
import { UxErrorPanel } from './error-panel.js';
import { UxBadge } from './badge.js';
import { UxAvatar } from './avatar.js';
import { UxSkeleton } from './skeleton.js';
import { UxPage } from './page.js';
import { UxComboBox } from './combobox.js';
import { UxDatePicker } from './date-picker.js';
import { UxFileUpload } from './file-upload.js';
import { UxDropZone } from './dropzone.js';
import { UxSearchBar } from './search-bar.js';
import { UxTreeNav } from './tree-nav.js';
import { UxNotifications } from './notifications.js';
import { UxDataGrid } from './data-grid.js';
import { UxTableVirtual } from './table-virtual.js';
import { UxTable } from './table.js';
import { UxValue } from './value.js';
import { UxSplash } from './splash-screen.js';
import { UxCheckbox } from './checkbox.js';
import { UxRadioGroup } from './radio-group.js';
import { UxMegaMenu } from './mega-menu.js';
import { UxContextMenu } from './context-menu.js';
import { UxButton } from './button.js';
import { UxLightbox } from './lightbox.js';
import { UxModal } from './modal.js';
import { UxPanel } from './panel.js';
import { UxDropdown } from './dropdown.js';
import { UxField } from '../form/field.js';
import { UxFieldArray } from '../form/field-array.js';
import { UxToastContainer, UxToast } from '../shell/toast.js';
import { UxConsentBanner } from '../shell/consent-banner.js';
import { UxGateAuth } from '../shell/gate-auth.js';
import { UxGateAnon, UxGateRole, UxGateScope, UxGateFeature } from '../shell/gate-wrappers.js';
import { UxNav } from '../shell/nav-panel.js';
import { regionPrimitives } from './regions.js';

const _ALL_PRIMITIVES: PrimitiveDefinition[] = [
  // ── Action ──
  { tag: 'ux-link', role: 'link', kind: 'link', family: 'action' },
  { tag: 'ux-button', role: 'button', kind: 'button', family: 'action' },

  // ── Form ──
  { tag: 'ux-input', role: 'textbox', kind: 'input', family: 'form', formAssociated: true },
  { tag: 'ux-textarea', role: 'textbox', kind: 'textarea', family: 'form', formAssociated: true },
  { tag: 'ux-select', role: 'listbox', kind: 'select', family: 'form', formAssociated: true },
  { tag: 'ux-combobox', role: 'combobox', kind: 'combobox', family: 'form', formAssociated: true },
  { tag: 'ux-checkbox', role: 'checkbox', kind: 'checkbox', stateAttr: 'checked', family: 'form', formAssociated: true },
  { tag: 'ux-switch', role: 'switch', kind: 'switch', stateAttr: 'checked', family: 'form', formAssociated: true },
  { tag: 'ux-slider', role: 'slider', kind: 'slider', family: 'form', formAssociated: true },
  { tag: 'ux-radio-group', role: 'radiogroup', kind: 'radio-group', family: 'form', formAssociated: true },
  { tag: 'ux-date-picker', role: 'textbox', kind: 'date-picker', family: 'form', formAssociated: true },
  { tag: 'ux-file-upload', role: 'button', kind: 'file-upload', family: 'form', formAssociated: true },
  { tag: 'ux-search-bar', role: 'searchbox', kind: 'search-bar', family: 'form', formAssociated: true },
  { tag: 'ux-form', role: 'form', kind: 'form', family: 'form' },
  { tag: 'ux-field', role: 'group', kind: 'field', family: 'form', formAssociated: true },
  { tag: 'ux-field-array', role: 'group', kind: 'field-array', family: 'form' },

  // ── Navigation ──
  { tag: 'ux-tabs', role: 'tablist', kind: 'tabs', family: 'navigation' },
  { tag: 'ux-menu', role: 'menu', kind: 'menu', family: 'navigation' },
  { tag: 'ux-mega-menu', role: 'navigation', kind: 'mega-menu', family: 'navigation' },
  { tag: 'ux-breadcrumb', role: 'navigation', kind: 'breadcrumb', family: 'navigation' },
  { tag: 'ux-pagination', role: 'navigation', kind: 'pagination', family: 'navigation' },
  { tag: 'ux-tree-nav', role: 'tree', kind: 'tree-nav', family: 'navigation' },
  { tag: 'ux-command-palette', role: 'dialog', kind: 'command-palette', stateAttr: 'open', family: 'navigation' },
  { tag: 'ux-nav', role: 'navigation', kind: 'nav', family: 'navigation' },

  // ── Overlay ──
  { tag: 'ux-popover', role: 'dialog', kind: 'popover', stateAttr: 'open', family: 'overlay' },
  { tag: 'ux-tooltip', role: 'tooltip', kind: 'tooltip', stateAttr: 'open', family: 'overlay' },
  { tag: 'ux-drawer', role: 'dialog', kind: 'drawer', stateAttr: 'open', family: 'overlay' },
  { tag: 'ux-context-menu', role: 'menu', kind: 'context-menu', stateAttr: 'open', family: 'overlay' },
  { tag: 'ux-modal', role: 'dialog', kind: 'modal', stateAttr: 'open', family: 'overlay' },
  { tag: 'ux-dropdown', role: 'listbox', kind: 'dropdown', stateAttr: 'open', family: 'overlay' },
  { tag: 'ux-lightbox', role: 'dialog', kind: 'lightbox', stateAttr: 'open', family: 'overlay' },

  // ── Media ──
  { tag: 'ux-image', role: 'img', kind: 'image', family: 'media' },
  { tag: 'ux-image-panel', role: 'img', kind: 'toggle', stateAttr: 'open', family: 'media' },
  { tag: 'ux-video', role: 'group', kind: 'video', family: 'media' },
  { tag: 'ux-audio', role: 'group', kind: 'audio', family: 'media' },
  { tag: 'ux-wysiwyg', role: 'textbox', kind: 'wysiwyg', family: 'media' },
  { tag: 'ux-capture', role: 'button', kind: 'capture', family: 'media' },
  { tag: 'ux-image-capture', role: 'button', kind: 'capture', family: 'media' },
  { tag: 'ux-video-capture', role: 'button', kind: 'capture', family: 'media' },
  { tag: 'ux-audio-capture', role: 'button', kind: 'capture', family: 'media' },

  // ── Layout ──
  { tag: 'ux-card', role: 'article', kind: 'card', family: 'layout' },
  { tag: 'ux-page', role: 'region', kind: 'page', family: 'layout' },
  { tag: 'ux-splash', role: 'status', kind: 'splash', family: 'layout' },
  { tag: 'ux-splash-screen', role: 'status', kind: 'splash', family: 'layout' },
  { tag: 'ux-accordion', role: 'group', kind: 'accordion', stateAttr: 'open', family: 'layout' },
  { tag: 'ux-panel', role: 'region', kind: 'panel', family: 'layout' },

  // ── Feedback ──
  { tag: 'ux-alert', role: 'alert', kind: 'alert', family: 'feedback' },
  { tag: 'ux-empty-state', role: 'status', kind: 'empty-state', family: 'feedback' },
  { tag: 'ux-error-panel', role: 'alert', kind: 'error-panel', family: 'feedback' },
  { tag: 'ux-spinner', role: 'status', kind: 'spinner', family: 'feedback' },
  { tag: 'ux-progress', role: 'progressbar', kind: 'progress', family: 'feedback' },
  { tag: 'ux-badge', role: 'status', kind: 'badge', family: 'feedback' },
  { tag: 'ux-avatar', role: 'img', kind: 'avatar', family: 'feedback' },
  { tag: 'ux-skeleton', role: 'status', kind: 'skeleton', family: 'feedback' },
  { tag: 'ux-notifications', role: 'log', kind: 'notifications', family: 'feedback' },

  // ── Data ──
  { tag: 'ux-table', role: 'table', kind: 'table', family: 'data' },
  { tag: 'ux-data-grid', role: 'grid', kind: 'data-grid', family: 'data' },
  { tag: 'ux-table-virtual', role: 'table', kind: 'table-virtual', family: 'data' },
  { tag: 'ux-value', role: 'status', kind: 'value', family: 'data' },
  { tag: 'ux-dropzone', role: 'region', kind: 'dropzone', family: 'data' },

  // ── Shell ──
  { tag: 'ux-lang-switcher', role: 'listbox', kind: 'lang-switcher', family: 'shell' },
  { tag: 'ux-theme-toggle', role: 'switch', kind: 'theme-toggle', stateAttr: 'checked', family: 'shell' },
  { tag: 'ux-theme-switch', role: 'combobox', kind: 'theme-switch', family: 'shell' },
  { tag: 'ux-network-status', role: 'status', kind: 'network-status', family: 'shell' },
  { tag: 'ux-toast-container', role: 'log', kind: 'toast-container', family: 'shell' },
  { tag: 'ux-toast', role: 'status', kind: 'toast', family: 'shell' },
  { tag: 'ux-consent-banner', role: 'dialog', kind: 'consent-banner', family: 'shell' },
  { tag: 'ux-gate-auth', role: 'group', kind: 'gate-auth', family: 'shell' },
  { tag: 'ux-gate-anon', role: 'group', kind: 'gate-anon', family: 'shell' },
  { tag: 'ux-gate-role', role: 'group', kind: 'gate-role', family: 'shell' },
  { tag: 'ux-gate-scope', role: 'group', kind: 'gate-scope', family: 'shell' },
  { tag: 'ux-gate-feature', role: 'group', kind: 'gate-feature', family: 'shell' },

  // ── Wizard ──
  { tag: 'ux-wizard', role: 'group', kind: 'wizard', family: 'wizard' },

  ...regionPrimitives,
];

for (const def of _ALL_PRIMITIVES) {
  registerWidget(def);
}

void [UxLink, UxTabs, UxAccordion, UxSlider, UxToggle, UxInput, UxTextarea,
  UxSelect, UxForm, UxMenu, UxPagination, UxBreadcrumb, UxCommandPalette,
  UxWizard, UxPopover, UxTooltip, UxDrawer, UxCapture, UxProgress,
  UxImage, UxVideo, UxAudio, UxWysiwyg,
  UxLangSwitcher, UxThemeToggle, UxThemeSwitch, UxNetworkStatus,
  UxCard, UxAlert, UxSpinner, UxEmptyState, UxErrorPanel, UxBadge, UxAvatar,
  UxSkeleton, UxPage, UxComboBox, UxDatePicker, UxFileUpload, UxDropZone,
  UxSearchBar, UxTreeNav, UxNotifications, UxDataGrid,
  UxTableVirtual, UxValue, UxSplash, UxRadioGroup, UxTable, UxMegaMenu,
  UxContextMenu, UxCheckbox, UxButton, UxModal, UxPanel, UxDropdown, UxLightbox,
  UxField, UxFieldArray, UxToastContainer, UxToast, UxConsentBanner,
  UxGateAuth, UxGateAnon, UxGateRole, UxGateScope, UxGateFeature, UxNav];

export const DEF_BY_TAG = new Map(_ALL_PRIMITIVES.map((def) => [def.tag, def]));

export function getAllPrimitiveDefs(): PrimitiveDefinition[] {
  return [..._ALL_PRIMITIVES];
}
