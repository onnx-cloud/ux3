import type { PrimitiveKind } from './types.js';
import { UxRegion } from './region.js';
import { UxToggle } from './toggle.js';
import { UxAccordion } from './accordion.js';
import { UxValue } from './value.js';
import { UxSlider } from './slider.js';
import { UxInput } from './input.js';
import { UxTextarea } from './textarea.js';
import { UxForm } from './form.js';
import { UxImage, UxVideo, UxAudio } from './media.js';
import { UxWysiwyg } from './wysiwyg.js';
import { UxTabs } from './tabs.js';
import { UxMenu } from './menu.js';
import { UxPopover } from './popover.js';
import { UxTooltip } from './tooltip.js';
import { UxDrawer } from './drawer.js';
import { UxWizard } from './wizard.js';
import { UxCapture } from './capture.js';
import { UxProgress } from './progress.js';
import { UxSelect } from './select.js';
import { UxChart } from './chart.js';
import { UxLangSwitcher, UxThemeToggle, UxNetworkStatus } from './context-tools.js';

export function resolveClass(kind: PrimitiveKind): typeof HTMLElement {
  switch (kind) {
    case 'toggle':
      return UxToggle;
    case 'checkbox':
    case 'switch':
      return UxToggle;
    case 'tabs':
      return UxTabs;
    case 'menu':
      return UxMenu;
    case 'accordion':
      return UxAccordion;
    case 'popover':
      return UxPopover;
    case 'tooltip':
      return UxTooltip;
    case 'drawer':
      return UxDrawer;
    case 'wizard':
      return UxWizard;
    case 'value':
      return UxValue;
    case 'input':
      return UxInput;
    case 'textarea':
      return UxTextarea;
    case 'slider':
      return UxSlider;
    case 'form':
      return UxForm;
    case 'image':
      return UxImage;
    case 'video':
      return UxVideo;
    case 'audio':
      return UxAudio;
    case 'wysiwyg':
      return UxWysiwyg;
    case 'capture':
      return UxCapture;
    case 'progress':
      return UxProgress;
    case 'chart':
      return UxChart;
    case 'select':
      return UxSelect;
    case 'network-status':
      return UxNetworkStatus;
    case 'theme-toggle':
      return UxThemeToggle;
    case 'lang-switcher':
      return UxLangSwitcher;
    default:
      return UxRegion;
  }
}
