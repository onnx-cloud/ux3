import { getAllPrimitiveDefs } from './registry.js';
import { resolveClass } from './resolve.js';

export { UxBase } from './base.js';
export { UxRegion } from './region.js';
export { UxToggle } from './toggle.js';
export { UxAccordion } from './accordion.js';
export { UxValue } from './value.js';
export { UxSlider } from './slider.js';
export { UxInput } from './input.js';
export { UxTextarea } from './textarea.js';
export { UxForm } from './form.js';
export { UxImage, UxVideo, UxAudio } from './media.js';
export { UxWysiwyg } from './wysiwyg.js';
export { UxTabs } from './tabs.js';
export { UxMenu } from './menu.js';
export { UxPopover } from './popover.js';
export { UxTooltip } from './tooltip.js';
export { UxDrawer } from './drawer.js';
export { UxWizard } from './wizard.js';
export { UxCapture } from './capture.js';
export { UxProgress } from './progress.js';
export { UxSelect } from './select.js';
export { UxLangSwitcher, UxThemeToggle, UxThemeSwitch, UxNetworkStatus } from '../shell/context-tools.js';
export { UxCard } from './card.js';
export { UxAlert } from './alert.js';
export { UxSpinner } from './spinner.js';
export { UxEmptyState } from './empty-state.js';
export { UxErrorPanel } from './error-panel.js';
export { UxPagination } from './pagination.js';
export { UxBreadcrumb } from './breadcrumb.js';
export { UxCommandPalette } from './command-palette.js';
export { UxBadge } from './badge.js';
export { UxAvatar } from './avatar.js';
export { UxSkeleton } from './skeleton.js';
export { UxPage } from './page.js';
export { UxComboBox } from './combobox.js';
export { UxDatePicker } from './date-picker.js';
export { UxFileUpload } from './file-upload.js';
export { UxDropZone } from './dropzone.js';
export { UxSearchBar } from './search-bar.js';
export { UxTreeNav } from './tree-nav.js';
export { UxNotifications } from './notifications.js';
export { UxDataGrid } from './data-grid.js';
export { UxTableVirtual } from './table-virtual.js';
export { UxTable } from './table.js';
export { UxLink } from './link.js';
export { UxMegaMenu } from './mega-menu.js';
export { UxContextMenu } from './context-menu.js';
export { UxCheckbox } from './checkbox.js';
export { UxRadioGroup } from './radio-group.js';
export { resolveClass } from './resolve.js';
import './lightbox.js';
export type { PrimitiveKind, PrimitiveDefinition } from './types.js';

export { registerWidget, resolveWidgetMetadata, getRegisteredWidgets } from '../widget-registry.js';

export function registerBuiltInPrimitives(): void {
  for (const definition of getAllPrimitiveDefs()) {
    if (typeof customElements !== 'undefined' && !customElements.get(definition.tag)) {
      const BaseClass = resolveClass(definition.kind);
      const ElementClass = class extends BaseClass {};
      Object.defineProperty(ElementClass, 'primitiveDef', { value: definition });
      customElements.define(definition.tag, ElementClass);
    }
  }
  if (typeof window !== 'undefined') (window as any).__ux3PrimitivesDefined = true;
}

registerBuiltInPrimitives();
