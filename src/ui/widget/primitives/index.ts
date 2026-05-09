/**
 * UX3 built-in primitive components.
 *
 * Components in this module are concrete, production-safe elements that provide
 * semantic roles, keyboard behavior, state events, and slot-based rendering.
 * Richer widgets like ux-button and ux-modal remain sourced from their
 * dedicated implementations and are not overridden.
 */
import { ALL_PRIMITIVES } from './registry.js';
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
export { UxChart } from './chart.js';
export { UxLangSwitcher, UxThemeToggle, UxNetworkStatus } from './context-tools.js';
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
export { UxQrCode } from './qr-code.js';
export { UxDataGrid } from './data-grid.js';
export { UxFlowEditor } from './flow-editor.js';
export { UxWorkflow } from './workflow.js';
export { UxCalendar } from './calendar.js';
export { UxKanban } from './kanban.js';
export { UxGantt } from './gantt.js';
export { UxDashboard } from './dashboard.js';
export { UxKpiBoard } from './kpi-board.js';
export { UxQueryBuilder } from './query-builder.js';
export { UxFilterBuilder } from './filter-builder.js';
export { UxPivotTable } from './pivot-table.js';
export { UxReportBuilder } from './report-builder.js';
export { UxTableVirtual } from './table-virtual.js';
export { UxTable } from './table.js';
export { UxLink } from './link.js';
export { UxChatMessages } from './chat-messages.js';
export { resolveClass } from './resolve.js';
export type { PrimitiveKind, PrimitiveDefinition } from './types.js';

export function registerBuiltInPrimitives(): void {
  for (const definition of ALL_PRIMITIVES) {
    if (!customElements.get(definition.tag)) {
      const BaseClass = resolveClass(definition.kind);
      const ElementClass = class extends BaseClass {};
      customElements.define(definition.tag, ElementClass);
    }
  }
}

registerBuiltInPrimitives();
