import { UxBase } from './base.js';
import { registerLightStyle } from '../../style-registry.js';

const STYLE_ID = 'ux-radio-group-style';
const STYLE_CSS = `    ux-radio-group { display: flex; flex-wrap: wrap; align-items: center; gap: 0.75rem; }
    ux-radio-group[data-variant="stacked"] { flex-direction: column; align-items: flex-start; }
    ux-radio-group label.option { display: inline-flex; align-items: center; gap: 0.375rem; cursor: pointer; font-size: 0.875rem; color: var(--_rg-label, #334155); user-select: none; white-space: nowrap; }
    ux-radio-group label.option input[type=radio] { accent-color: var(--_rg-accent, #3b82f6); margin: 0; width: 1rem; height: 1rem; cursor: pointer; flex-shrink: 0; }
    ux-radio-group label.option.disabled { opacity: 0.5; cursor: not-allowed; pointer-events: none; }
    ux-radio-group label.option.disabled input { cursor: not-allowed; }`;
registerLightStyle(STYLE_ID, STYLE_CSS);

export interface RadioOption {
  label: string;
  value: string;
  disabled?: boolean;
}

export class UxRadioGroup extends UxBase {
  private _rendered = false;

  static get observedAttributes(): string[] {
    return ['value', 'name', 'required', 'disabled'];
  }

  protected onConnected(): void {
    super.onConnected();
    this.setAttribute('role', 'radiogroup');
    if (!this._rendered) {
      this._rendered = true;
      this.render();
    }
    this.addEventListener('click', this.onClick);
    this.addEventListener('keydown', this.onKeyDown);
  }

  protected onDisconnected(): void {
    this.removeEventListener('click', this.onClick);
    this.removeEventListener('keydown', this.onKeyDown);
    super.onDisconnected();
  }

  protected applyData(data: any): void {
    if (typeof data === 'string' || typeof data === 'number') {
      this.setAttribute('value', String(data));
      this.updateSelection();
    } else if (data && typeof data === 'object') {
      if ('value' in data) {
        this.setAttribute('value', String(data.value ?? ''));
        this.updateSelection();
      }
      if (Array.isArray(data.options)) {
        this.render(data.options.map((o: any) => {
          if (typeof o === 'string') return { label: o, value: o };
          return {
            label: o.label ?? o.value ?? '',
            value: o.value ?? o.label ?? '',
            disabled: o.disabled ?? false,
          };
        }));
      }
    }
  }

  protected onAttributeChanged(name: string, _ov: string | null, _nv: string | null): void {
    if (name === 'value') {
      this.updateSelection();
    }
    if (name === 'disabled') {
      const disabled = this.hasAttribute('disabled');
      this.querySelectorAll('input[type=radio]').forEach((r) => {
        (r as HTMLInputElement).disabled = disabled;
      });
    }
  }

  private updateSelection(): void {
    const currentValue = this.getAttribute('value') || '';
    const radios = this.querySelectorAll<HTMLInputElement>('input[type=radio]');
    radios.forEach((radio) => {
      radio.checked = radio.value === currentValue;
    });
  }

  private parseOptions(): RadioOption[] {
    const attr = this.getAttribute('options');
    if (attr) {
      try {
        const parsed = JSON.parse(attr);
        if (Array.isArray(parsed)) {
          return parsed.map((o: any) => {
            if (typeof o === 'string') return { label: o, value: o };
            return { label: o.label ?? o.value ?? '', value: o.value ?? o.label ?? '', disabled: o.disabled ?? false };
          });
        }
      } catch {}
      return attr.split(',').map(s => s.trim()).filter(Boolean).map(s => ({ label: s, value: s }));
    }
    const children = Array.from(this.querySelectorAll('option, [data-option]'));
    if (children.length > 0) {
      return children.map((el) => {
        if (el.hasAttribute('data-option')) {
          return {
            label: (el as HTMLElement).dataset.option || el.textContent || '',
            value: (el as HTMLElement).dataset.value || '',
            disabled: el.hasAttribute('disabled'),
          };
        }
        const opt = el as HTMLOptionElement;
        return { label: el.textContent?.trim() || opt.value || '', value: opt.value || el.textContent?.trim() || '', disabled: opt.disabled };
      });
    }
    return [];
  }

  private render(opts?: RadioOption[]): void {
    const currentValue = this.getAttribute('value') || '';
    const options = opts ?? this.parseOptions();
    const groupName = this.getAttribute('name') || `_rg_${Math.random().toString(36).slice(2, 9)}`;

    const radios = options.map((opt) => {
      const checked = opt.value === currentValue ? ' checked' : '';
      const disabled = this.hasAttribute('disabled') || opt.disabled ? ' disabled' : '';
      const disabledClass = (this.hasAttribute('disabled') || opt.disabled) ? ' disabled' : '';
      return `<label class="option${disabledClass}"><input type="radio" name="${groupName}" value="${this.escapeHtml(opt.value)}"${checked}${disabled} tabindex="0" /><span>${this.escapeHtml(opt.label)}</span></label>`;
    }).join('');

    this.innerHTML = radios;
  }

  private escapeHtml(str: string): string {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  private readonly onClick = (e: Event) => {
    const radio = (e.target as HTMLElement).closest('input[type=radio]') as HTMLInputElement | null;
    if (!radio) return;
    const val = radio.value;
    this.setAttribute('value', val);
    this.dispatchEvent(new CustomEvent('ux:input.change', { bubbles: true, detail: { value: val } }));
  };

  private readonly onKeyDown = (e: KeyboardEvent) => {
    const radios = this.querySelectorAll<HTMLInputElement>('input[type=radio]');
    if (radios.length === 0) return;

    let currentIndex = -1;
    radios.forEach((radio, i) => {
      if (radio.checked) currentIndex = i;
    });

    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') {
      e.preventDefault();
      const nextIndex = (currentIndex + 1) % radios.length;
      radios[nextIndex].checked = true;
      radios[nextIndex].focus();
      this.setAttribute('value', radios[nextIndex].value);
      this.dispatchEvent(new CustomEvent('ux:input.change', { bubbles: true, detail: { value: radios[nextIndex].value } }));
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') {
      e.preventDefault();
      const prevIndex = (currentIndex - 1 + radios.length) % radios.length;
      radios[prevIndex].checked = true;
      radios[prevIndex].focus();
      this.setAttribute('value', radios[prevIndex].value);
      this.dispatchEvent(new CustomEvent('ux:input.change', { bubbles: true, detail: { value: radios[prevIndex].value } }));
    }
  };
}
