import type { PrimitiveDefinition } from './types.js';
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
import { UxLangSwitcher, UxThemeToggle, UxNetworkStatus } from '../shell/context-tools.js';
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
import { UxRadioGroup } from './radio-group.js';
import { regionPrimitives } from './regions.js';

export const ALL_PRIMITIVES: PrimitiveDefinition[] = [
  { tag: 'ux-link', role: 'link', kind: 'link' },
  { tag: 'ux-tabs', role: 'tablist', kind: 'tabs' },
  { tag: 'ux-accordion', role: 'group', kind: 'accordion', stateAttr: 'open' },
  { tag: 'ux-slider', role: 'slider', kind: 'slider' },
  { tag: 'ux-checkbox', role: 'checkbox', kind: 'checkbox', stateAttr: 'checked' },
  { tag: 'ux-switch', role: 'switch', kind: 'switch', stateAttr: 'checked' },
  { tag: 'ux-input', role: 'textbox', kind: 'input' },
  { tag: 'ux-textarea', role: 'textbox', kind: 'textarea' },
  { tag: 'ux-select', role: 'listbox', kind: 'select' },
  { tag: 'ux-form', role: 'form', kind: 'form' },
  { tag: 'ux-menu', role: 'menu', kind: 'menu' },
  { tag: 'ux-pagination', role: 'navigation', kind: 'pagination' },
  { tag: 'ux-breadcrumb', role: 'navigation', kind: 'breadcrumb' },
  { tag: 'ux-breadcrumbs', role: 'navigation', kind: 'breadcrumb' },
  { tag: 'ux-command-palette', role: 'dialog', kind: 'command-palette', stateAttr: 'open' },
  { tag: 'ux-wizard', role: 'group', kind: 'wizard' },
  { tag: 'ux-popover', role: 'dialog', kind: 'popover', stateAttr: 'open' },
  { tag: 'ux-tooltip', role: 'tooltip', kind: 'tooltip', stateAttr: 'open' },
  { tag: 'ux-drawer', role: 'dialog', kind: 'drawer', stateAttr: 'open' },
  { tag: 'ux-image-capture', role: 'button', kind: 'capture' },
  { tag: 'ux-video-capture', role: 'button', kind: 'capture' },
  { tag: 'ux-audio-capture', role: 'button', kind: 'capture' },
  { tag: 'ux-progress', role: 'progressbar', kind: 'progress' },
  { tag: 'ux-image', role: 'img', kind: 'image' },
  { tag: 'ux-image-panel', role: 'img', kind: 'toggle', stateAttr: 'open' },
  { tag: 'ux-video', role: 'group', kind: 'video' },
  { tag: 'ux-audio', role: 'group', kind: 'audio' },
  { tag: 'ux-wysiwyg', role: 'textbox', kind: 'wysiwyg' },
  { tag: 'ux-lang-switcher', role: 'listbox', kind: 'lang-switcher' },
  { tag: 'ux-theme-toggle', role: 'switch', kind: 'theme-toggle', stateAttr: 'checked' },
  { tag: 'ux-network-status', role: 'status', kind: 'network-status' },
  { tag: 'ux-card', role: 'article', kind: 'card' },
  { tag: 'ux-alert', role: 'alert', kind: 'alert' },
  { tag: 'ux-spinner', role: 'status', kind: 'spinner' },
  { tag: 'ux-empty-state', role: 'status', kind: 'empty-state' },
  { tag: 'ux-error-panel', role: 'alert', kind: 'error-panel' },
  { tag: 'ux-badge', role: 'status', kind: 'badge' },
  { tag: 'ux-avatar', role: 'img', kind: 'avatar' },
  { tag: 'ux-skeleton', role: 'status', kind: 'skeleton' },
  { tag: 'ux-page', role: 'region', kind: 'page' },
  { tag: 'ux-combobox', role: 'combobox', kind: 'combobox' },
  { tag: 'ux-date-picker', role: 'textbox', kind: 'date-picker' },
  { tag: 'ux-file-upload', role: 'button', kind: 'file-upload' },
  { tag: 'ux-dropzone', role: 'region', kind: 'dropzone' },
  { tag: 'ux-search-bar', role: 'searchbox', kind: 'search-bar' },
  { tag: 'ux-tree-nav', role: 'tree', kind: 'tree-nav' },
  { tag: 'ux-notifications', role: 'log', kind: 'notifications' },
  { tag: 'ux-data-grid', role: 'grid', kind: 'data-grid' },
  { tag: 'ux-table-virtual', role: 'table', kind: 'table-virtual' },
  { tag: 'ux-table', role: 'table', kind: 'table' },
  { tag: 'ux-splash', role: 'status', kind: 'splash' },
  { tag: 'ux-splash-screen', role: 'status', kind: 'splash' },
  { tag: 'ux-radio-group', role: 'radiogroup', kind: 'radio-group' },
  ...regionPrimitives,
];

void [UxLink, UxTabs, UxAccordion, UxSlider, UxToggle, UxInput, UxTextarea,
  UxSelect, UxForm, UxMenu, UxPagination, UxBreadcrumb, UxCommandPalette,
  UxWizard, UxPopover, UxTooltip, UxDrawer, UxCapture, UxProgress,
  UxImage, UxVideo, UxAudio, UxWysiwyg,
  UxLangSwitcher, UxThemeToggle, UxNetworkStatus,
  UxCard, UxAlert, UxSpinner, UxEmptyState, UxErrorPanel, UxBadge, UxAvatar,
  UxSkeleton, UxPage, UxComboBox, UxDatePicker, UxFileUpload, UxDropZone,
  UxSearchBar, UxTreeNav, UxNotifications, UxDataGrid,
  UxTableVirtual, UxValue, UxSplash, UxRadioGroup, UxTable];

export const DEF_BY_TAG = new Map(ALL_PRIMITIVES.map((def) => [def.tag, def]));
