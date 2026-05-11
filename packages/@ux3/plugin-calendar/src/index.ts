import type { Plugin } from '../../../../src/plugin/registry';
import { UxCalendar } from './calendar.js';

const version = '0.1.0';

const CalendarPlugin: Plugin = {
  name: '@ux3/plugin-calendar',
  version,
  description: 'Calendar widget for UX3',
  install() {
    if (!customElements.get('ux-calendar')) {
      customElements.define('ux-calendar', UxCalendar);
    }
  },
};

export { UxCalendar };
export default CalendarPlugin;
