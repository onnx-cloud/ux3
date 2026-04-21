import type { Widget, WidgetConfig } from '../../../../../src/ui/widget/widget';
import type { AppContext } from '../../../../../src/ui/app';

// basic widget that renders a button and sends a TOGGLE event to the
// "dropdown" FSM when clicked
export default class DropdownButton extends HTMLElement implements Widget {
  app!: AppContext;
  widget!: WidgetConfig;
  state: any;
  classes = '';

  inState(): boolean {
    return true;
  }

  context(): Record<string, any> {
    return {};
  }

  buildHTML() {
    return `<button ux-on="click:TOGGLE" class="px-4 py-2 bg-green-500 text-white rounded">Toggle (widget)</button>`;
  }
}
