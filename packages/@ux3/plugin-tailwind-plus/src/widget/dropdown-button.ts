import { Widget } from '../../../src/ui/widget';

// basic widget that renders a button and sends a TOGGLE event to the
// "dropdown" FSM when clicked
export default class DropdownButton extends Widget {
  buildHTML() {
    return `<button ux-on="click:TOGGLE" class="px-4 py-2 bg-green-500 text-white rounded">Toggle (widget)</button>`;
  }
}
