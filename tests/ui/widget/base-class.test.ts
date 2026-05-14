import { describe, it, expect } from 'vitest';
import { UxBase } from '../../../src/ui/widget/primitives/base.js';
import { UxToggle } from '../../../src/ui/widget/primitives/toggle.js';
import { UxValue } from '../../../src/ui/widget/primitives/value.js';
import { LifecycleComponent } from '../../../src/ui/lifecycle-component.js';
import { UxTabs } from '../../../src/ui/widget/primitives/tabs.js';
import { UxInput } from '../../../src/ui/widget/primitives/input.js';
import { UxSelect } from '../../../src/ui/widget/primitives/select.js';
import { UxForm } from '../../../src/ui/widget/primitives/form.js';
import { UxComboBox } from '../../../src/ui/widget/primitives/combobox.js';
import { UxDatePicker } from '../../../src/ui/widget/primitives/date-picker.js';
import { UxCheckbox } from '../../../src/ui/widget/primitives/checkbox.js';
import { UxRadioGroup } from '../../../src/ui/widget/primitives/radio-group.js';
import { UxDropdown } from '../../../src/ui/widget/primitives/dropdown.js';
import { UxPanel } from '../../../src/ui/widget/primitives/panel.js';
import { UxModal } from '../../../src/ui/widget/primitives/modal.js';
import { UxButton } from '../../../src/ui/widget/primitives/button.js';
import { UxAccordion } from '../../../src/ui/widget/primitives/accordion.js';
import { UxPopover } from '../../../src/ui/widget/primitives/popover.js';
import { UxDrawer } from '../../../src/ui/widget/primitives/drawer.js';
import { UxTooltip } from '../../../src/ui/widget/primitives/tooltip.js';
import { UxWizard } from '../../../src/ui/widget/primitives/wizard.js';
import { UxProgress } from '../../../src/ui/widget/primitives/progress.js';
import { UxImage, UxVideo, UxAudio } from '../../../src/ui/widget/primitives/media.js';
import { UxCapture } from '../../../src/ui/widget/primitives/capture.js';
import { UxCard } from '../../../src/ui/widget/primitives/card.js';
import { UxAlert } from '../../../src/ui/widget/primitives/alert.js';
import { UxSpinner } from '../../../src/ui/widget/primitives/spinner.js';
import { UxEmptyState } from '../../../src/ui/widget/primitives/empty-state.js';
import { UxErrorPanel } from '../../../src/ui/widget/primitives/error-panel.js';
import { UxBadge } from '../../../src/ui/widget/primitives/badge.js';
import { UxAvatar } from '../../../src/ui/widget/primitives/avatar.js';
import { UxSkeleton } from '../../../src/ui/widget/primitives/skeleton.js';
import { UxPage } from '../../../src/ui/widget/primitives/page.js';
import { UxPagination } from '../../../src/ui/widget/primitives/pagination.js';
import { UxBreadcrumb } from '../../../src/ui/widget/primitives/breadcrumb.js';
import { UxMegaMenu } from '../../../src/ui/widget/primitives/mega-menu.js';
import { UxContextMenu } from '../../../src/ui/widget/primitives/context-menu.js';
import { UxSearchBar } from '../../../src/ui/widget/primitives/search-bar.js';
import { UxCommandPalette } from '../../../src/ui/widget/primitives/command-palette.js';
import { UxFileUpload } from '../../../src/ui/widget/primitives/file-upload.js';
import { UxDropZone } from '../../../src/ui/widget/primitives/dropzone.js';
import { UxWysiwyg } from '../../../src/ui/widget/primitives/wysiwyg.js';
import { UxSlider } from '../../../src/ui/widget/primitives/slider.js';
import { UxMenu } from '../../../src/ui/widget/primitives/menu.js';
import { UxTextarea } from '../../../src/ui/widget/primitives/textarea.js';
import { UxTable } from '../../../src/ui/widget/primitives/table.js';
import { UxDataGrid } from '../../../src/ui/widget/primitives/data-grid.js';
import { UxTableVirtual } from '../../../src/ui/widget/primitives/table-virtual.js';
import { UxTreeNav } from '../../../src/ui/widget/primitives/tree-nav.js';
import { UxNotifications } from '../../../src/ui/widget/primitives/notifications.js';
import { UxLink } from '../../../src/ui/widget/primitives/link.js';
import { UxSplash } from '../../../src/ui/widget/primitives/splash-screen.js';
import { UxLangSwitcher, UxThemeToggle, UxNetworkStatus } from '../../../src/ui/widget/shell/context-tools.js';
import { UxField } from '../../../src/ui/widget/form/field.js';
import { UxFieldArray } from '../../../src/ui/widget/form/field-array.js';
import { UxGateAuth } from '../../../src/ui/widget/shell/gate-auth.js';
import { UxGateAnon, UxGateRole, UxGateScope, UxGateFeature } from '../../../src/ui/widget/shell/gate-wrappers.js';
import { UxNav } from '../../../src/ui/widget/shell/nav-panel.js';

const PRIMITIVE_WIDGETS: Array<{ name: string; Ctor: new (...args: any[]) => HTMLElement }> = [
  { name: 'UxTabs', Ctor: UxTabs },
  { name: 'UxInput', Ctor: UxInput },
  { name: 'UxSelect', Ctor: UxSelect },
  { name: 'UxForm', Ctor: UxForm },
  { name: 'UxComboBox', Ctor: UxComboBox },
  { name: 'UxDatePicker', Ctor: UxDatePicker },
  { name: 'UxCheckbox', Ctor: UxCheckbox },
  { name: 'UxRadioGroup', Ctor: UxRadioGroup },
  { name: 'UxDropdown', Ctor: UxDropdown },
  { name: 'UxPanel', Ctor: UxPanel },
  { name: 'UxModal', Ctor: UxModal },
  { name: 'UxButton', Ctor: UxButton },
  { name: 'UxAccordion', Ctor: UxAccordion },
  { name: 'UxPopover', Ctor: UxPopover },
  { name: 'UxDrawer', Ctor: UxDrawer },
  { name: 'UxTooltip', Ctor: UxTooltip },
  { name: 'UxWizard', Ctor: UxWizard },
  { name: 'UxProgress', Ctor: UxProgress },
  { name: 'UxImage', Ctor: UxImage },
  { name: 'UxVideo', Ctor: UxVideo },
  { name: 'UxAudio', Ctor: UxAudio },
  { name: 'UxCapture', Ctor: UxCapture },
  { name: 'UxCard', Ctor: UxCard },
  { name: 'UxAlert', Ctor: UxAlert },
  { name: 'UxSpinner', Ctor: UxSpinner },
  { name: 'UxEmptyState', Ctor: UxEmptyState },
  { name: 'UxErrorPanel', Ctor: UxErrorPanel },
  { name: 'UxBadge', Ctor: UxBadge },
  { name: 'UxAvatar', Ctor: UxAvatar },
  { name: 'UxSkeleton', Ctor: UxSkeleton },
  { name: 'UxPage', Ctor: UxPage },
  { name: 'UxPagination', Ctor: UxPagination },
  { name: 'UxBreadcrumb', Ctor: UxBreadcrumb },
  { name: 'UxMegaMenu', Ctor: UxMegaMenu },
  { name: 'UxContextMenu', Ctor: UxContextMenu },
  { name: 'UxSearchBar', Ctor: UxSearchBar },
  { name: 'UxCommandPalette', Ctor: UxCommandPalette },
  { name: 'UxFileUpload', Ctor: UxFileUpload },
  { name: 'UxDropZone', Ctor: UxDropZone },
  { name: 'UxWysiwyg', Ctor: UxWysiwyg },
  { name: 'UxSlider', Ctor: UxSlider },
  { name: 'UxMenu', Ctor: UxMenu },
  { name: 'UxTextarea', Ctor: UxTextarea },
  { name: 'UxTable', Ctor: UxTable },
  { name: 'UxDataGrid', Ctor: UxDataGrid },
  { name: 'UxTableVirtual', Ctor: UxTableVirtual },
  { name: 'UxTreeNav', Ctor: UxTreeNav },
  { name: 'UxNotifications', Ctor: UxNotifications },
  { name: 'UxLink', Ctor: UxLink },
  { name: 'UxSplash', Ctor: UxSplash },
  { name: 'UxLangSwitcher', Ctor: UxLangSwitcher },
  { name: 'UxThemeToggle', Ctor: UxThemeToggle },
  { name: 'UxNetworkStatus', Ctor: UxNetworkStatus },
  { name: 'UxField', Ctor: UxField },
  { name: 'UxFieldArray', Ctor: UxFieldArray },
  { name: 'UxGateAuth', Ctor: UxGateAuth },
  { name: 'UxGateAnon', Ctor: UxGateAnon },
  { name: 'UxGateRole', Ctor: UxGateRole },
  { name: 'UxGateScope', Ctor: UxGateScope },
  { name: 'UxGateFeature', Ctor: UxGateFeature },
  { name: 'UxNav', Ctor: UxNav },
];

const ACCEPTABLE_BASES = new Set([
  UxBase,
  LifecycleComponent,
  HTMLElement,
  // The abstract __HTMLElement shim used when HTMLElement is unavailable (SSR):
  (LifecycleComponent as any).prototype
    ? Object.getPrototypeOf(LifecycleComponent.prototype)?.constructor
    : null,
]);

function chainSelf(proto: any): string[] {
  const chain: string[] = [];
  for (let p = proto; p; p = Object.getPrototypeOf(p)) {
    chain.push(p.constructor?.name || 'anonymous');
  }
  return chain;
}

function extendsLifecycleComponent(Ctor: new (...args: any[]) => HTMLElement): boolean {
  let proto = Ctor.prototype;
  while (proto) {
    const ctor = proto.constructor;
    if (ACCEPTABLE_BASES.has(ctor)) return true;
    proto = Object.getPrototypeOf(proto);
  }
  return false;
}

describe('Widget base class contract', () => {
  describe('UxBase chain integrity', () => {
    it('UxBase extends LifecycleComponent', () => {
      expect(UxBase.prototype).toBeInstanceOf(LifecycleComponent);
    });

    it('UxToggle extends UxBase', () => {
      expect(UxToggle.prototype).toBeInstanceOf(UxBase);
    });

    it('UxValue extends UxBase', () => {
      expect(UxValue.prototype).toBeInstanceOf(UxBase);
    });
  });

  describe('every framework widget extends LifecycleComponent (or known base)', () => {
    for (const { name, Ctor } of PRIMITIVE_WIDGETS) {
      it(`${name} extends LifecycleComponent chain`, () => {
        expect(
          extendsLifecycleComponent(Ctor),
          `${name} must extend UxBase, LifecycleComponent, or HTMLElement. Found chain: ${chainSelf(Ctor.prototype).join(' → ')}`,
        ).toBe(true);
      });
    }
  });

  describe('no widget extends raw HTMLElement without reason', () => {
    const JUSTIFIED_RAW_HTMLELEMENT = new Set([
      'UxGateAuth',
      'UxGateAnon',
      'UxGateRole',
      'UxGateScope',
      'UxGateFeature',
      'UxNav',
    ]);

    for (const { name, Ctor } of PRIMITIVE_WIDGETS) {
      if (JUSTIFIED_RAW_HTMLELEMENT.has(name)) continue;

      it(`${name} must not extend HTMLElement directly`, () => {
        const proto = Object.getPrototypeOf(Ctor.prototype);
        const parentCtor = proto?.constructor;
        expect(parentCtor).not.toBe(HTMLElement);
      });
    }
  });
});
