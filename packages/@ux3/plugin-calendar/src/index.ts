import type { Plugin } from '../../../../src/plugin/registry';
import { createRequire } from 'module';
import { UxCalendar } from './calendar.js';

const _require = createRequire(import.meta.url);
const { version } = _require('../package.json') as { version: string };

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
