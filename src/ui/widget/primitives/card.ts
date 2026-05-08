import { UxToggle } from './toggle.js';

export class UxCard extends UxToggle {
  protected getStateAttr(): string {
    return 'expanded';
  }
}
