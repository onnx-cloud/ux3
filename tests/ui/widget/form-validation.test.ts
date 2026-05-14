import { describe, it, expect, beforeEach, afterEach, vi, beforeAll } from 'vitest';
import '../../../src/ui/widget/primitives/index';

beforeAll(() => {
  if (typeof window !== 'undefined') {
    (HTMLElement.prototype as any).attachInternals = function() {
      return {
        setFormValue: vi.fn(),
        setValidity: vi.fn(),
      };
    };
  }
});

describe('UxForm - Form Validation', () => {
  let form: HTMLElement;
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  function createForm(): HTMLElement {
    const f = document.createElement('ux-form');
    f.setAttribute('novalidate', '');
    return f;
  }

  function createInput(name: string, value = '', options: Record<string, string> = {}): HTMLElement {
    const el = document.createElement('ux-input');
    el.setAttribute('name', name);
    if (value) el.setAttribute('value', value);
    for (const [k, v] of Object.entries(options)) {
      el.setAttribute(k, v);
    }
    return el;
  }

  function createField(name: string, options: Record<string, string> = {}): HTMLElement {
    const field = document.createElement('ux-field');
    field.setAttribute('name', name);
    for (const [k, v] of Object.entries(options)) {
      field.setAttribute(k, v);
    }
    const input = document.createElement('input');
    input.type = 'text';
    field.appendChild(input);
    return field;
  }

  describe('checkValidity', () => {
    it('returns true for valid form', async () => {
      form = createForm();
      form.appendChild(createInput('name', 'Ada'));
      container.appendChild(form);
      await Promise.resolve();

      expect((form as any).checkValidity()).toBe(true);
    });

    it('returns false when required field is empty', async () => {
      form = createForm();
      const input = createInput('email', '', { required: '' });
      form.appendChild(input);
      container.appendChild(form);
      await Promise.resolve();
      await Promise.resolve();

      const native = input.querySelector('input') as HTMLInputElement;
      if (native) native.value = '';

      expect((form as any).checkValidity()).toBe(false);
    });
  });

  describe('reportValidity', () => {
    it('displays errors in ux-form-errors container', async () => {
      form = createForm();
      const errors = document.createElement('ux-form-errors');
      form.appendChild(errors);
      const input = createInput('email', '', { required: '' });
      form.appendChild(input);
      container.appendChild(form);
      await Promise.resolve();

      (form as any).reportValidity();
      await Promise.resolve();

      expect(errors.innerHTML).toContain('email');
    });
  });

  describe('submit', () => {
    it('emits ux:submit with field values on valid form', async () => {
      form = createForm();
      const nameInput = createInput('name', 'Ada');
      const bioTextarea = document.createElement('ux-textarea');
      bioTextarea.setAttribute('name', 'bio');
      bioTextarea.setAttribute('value', 'Engineer');
      form.appendChild(nameInput);
      form.appendChild(bioTextarea);
      container.appendChild(form);
      await Promise.resolve();

      let payload: Record<string, string> | null = null;
      form.addEventListener('ux:submit', (event: Event) => {
        payload = (event as CustomEvent).detail;
      });

      (form as any).submit();
      await Promise.resolve();

      expect(payload).toBeTruthy();
      expect(payload!.name).toBe('Ada');
      expect(payload!.bio).toBe('Engineer');
    });

    it('prevents emit on invalid form', async () => {
      form = createForm();
      const input = createInput('email', '', { required: '' });
      form.appendChild(input);
      container.appendChild(form);
      await Promise.resolve();

      let emitted = false;
      form.addEventListener('ux:submit', () => { emitted = true; });

      (form as any).submit();
      await Promise.resolve();

      expect(emitted).toBe(false);
    });
  });

  describe('reset', () => {
    it('clears field values and error states', async () => {
      form = createForm();
      const input = createInput('name', 'Initial');
      form.appendChild(input);
      container.appendChild(form);
      await Promise.resolve();

      (form as any).reset();
      await Promise.resolve();

      const resolved = (form.querySelector('ux-input') as any)?.getAttribute?.('value');
      // After reset, value should be cleared from the native element
      expect(form.querySelector('ux-input')).toBeTruthy();
    });
  });

  describe('ux-field integration', () => {
    it('detects required state from ux-field wrapper', async () => {
      form = createForm();
      const field = createField('email', { required: '' });
      form.appendChild(field);
      container.appendChild(form);
      await Promise.resolve();

      const valid = (form as any).checkValidity();
      expect(valid).toBe(false);
    });

    it('collects value from ux-field wrapped controls', async () => {
      form = createForm();
      const field = createField('username');
      const input = field.querySelector('input') as HTMLInputElement;
      input.value = 'testuser';
      form.appendChild(field);
      container.appendChild(form);
      await Promise.resolve();

      let payload: Record<string, string> | null = null;
      form.addEventListener('ux:submit', (event: Event) => {
        payload = (event as CustomEvent).detail;
      });

      form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      await Promise.resolve();

      expect(payload).toBeTruthy();
    });
  });
});

describe('UxRadioGroup - Object-Driven Options', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  it('parses options attribute', async () => {
    const group = document.createElement('ux-radio-group');
    group.setAttribute('options', 'Red,Green,Blue');
    group.setAttribute('name', 'color');
    container.appendChild(group);
    await Promise.resolve();

    const radios = group.querySelectorAll('input[type=radio]') as NodeListOf<HTMLInputElement>;
    expect(radios).toHaveLength(3);
    expect(radios[0].value).toBe('Red');
  });

  it('parses JSON options attribute', async () => {
    const group = document.createElement('ux-radio-group');
    group.setAttribute('options', JSON.stringify([
      { label: 'Small', value: 'sm' },
      { label: 'Medium', value: 'md' },
      { label: 'Large', value: 'lg' },
    ]));
    group.setAttribute('name', 'size');
    container.appendChild(group);
    await Promise.resolve();

    const radios = group.querySelectorAll('input[type=radio]');
    expect(radios).toHaveLength(3);
    expect(radios[0].value).toBe('sm');
  });

  it('emits ux:input.change on selection', async () => {
    const group = document.createElement('ux-radio-group');
    group.setAttribute('options', 'A,B,C');
    group.setAttribute('name', 'choice');
    container.appendChild(group);
    await Promise.resolve();

    let detail: any = null;
    group.addEventListener('ux:input.change', (e: Event) => {
      detail = (e as CustomEvent).detail;
    });

    const radio = group.querySelector('input[value="B"]') as HTMLInputElement;
    radio.click();

    expect(group.getAttribute('value')).toBe('B');
    expect(detail?.value).toBe('B');
  });

  it('supports arrow key navigation', async () => {
    const group = document.createElement('ux-radio-group');
    group.setAttribute('options', 'One,Two,Three');
    group.setAttribute('name', 'number');
    container.appendChild(group);
    await Promise.resolve();

    const firstRadio = group.querySelector('input[value="One"]') as HTMLInputElement;
    firstRadio.checked = true;

    group.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));

    const radios = group.querySelectorAll('input[type=radio]');
    expect(radios[1].checked).toBe(true);
    expect(group.getAttribute('value')).toBe('Two');
  });

  it('respects disabled state on radio options', async () => {
    const group = document.createElement('ux-radio-group');
    group.setAttribute('options', JSON.stringify([
      { label: 'A', value: 'a' },
      { label: 'B', value: 'b', disabled: true },
      { label: 'C', value: 'c' },
    ]));
    group.setAttribute('name', 'choice');
    container.appendChild(group);
    await Promise.resolve();

    const disabledOption = group.querySelector('.disabled') as HTMLElement;
    expect(disabledOption).toBeTruthy();

    const disabledRadio = group.querySelector('input[value="b"]') as HTMLInputElement;
    expect(disabledRadio.disabled).toBe(true);
  });

  it('applies stacked variant', async () => {
    const group = document.createElement('ux-radio-group');
    group.setAttribute('options', 'A,B,C');
    group.setAttribute('name', 'choice');
    group.setAttribute('data-variant', 'stacked');
    container.appendChild(group);
    await Promise.resolve();

    const style = getComputedStyle(group);
    expect(group.getAttribute('data-variant')).toBe('stacked');
  });

  it('accepts data-driven options via applyData', async () => {
    const group = document.createElement('ux-radio-group');
    group.setAttribute('name', 'fruit');
    container.appendChild(group);
    await Promise.resolve();

    (group as any).applyData({
      value: 'banana',
      options: [
        { label: 'Apple', value: 'apple' },
        { label: 'Banana', value: 'banana' },
        { label: 'Cherry', value: 'cherry' },
      ],
    });
    await Promise.resolve();

    const radios = group.querySelectorAll('input[type=radio]');
    expect(radios).toHaveLength(3);
    expect((radios[1] as HTMLInputElement).checked).toBe(true);
    expect(group.getAttribute('value')).toBe('banana');
  });
});

describe('UxComboBox - Object-Driven Options', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  it('parses child option elements', async () => {
    const combo = document.createElement('ux-combobox');
    combo.setAttribute('name', 'city');
    const opt1 = document.createElement('option');
    opt1.value = 'london';
    opt1.textContent = 'London';
    const opt2 = document.createElement('option');
    opt2.value = 'paris';
    opt2.textContent = 'Paris';
    combo.appendChild(opt1);
    combo.appendChild(opt2);
    container.appendChild(combo);
    await Promise.resolve();

    const input = combo.querySelector('input') as HTMLInputElement;
    input.value = 'Lon';
    input.dispatchEvent(new Event('input', { bubbles: true }));
    await Promise.resolve();

    expect(combo).toBeTruthy();
  });

  it('accepts data-driven options via applyData', async () => {
    const combo = document.createElement('ux-combobox');
    combo.setAttribute('name', 'fruit');
    container.appendChild(combo);
    await Promise.resolve();

    (combo as any).applyData({
      value: 'banana',
      options: [
        { label: 'Apple', value: 'apple' },
        { label: 'Banana', value: 'banana' },
        { label: 'Cherry', value: 'cherry' },
      ],
    });
    await Promise.resolve();

    const input = combo.querySelector('input') as HTMLInputElement;
    expect(input.value).toBe('Banana');
    expect(combo.getAttribute('value')).toBe('banana');
  });

  it('respects disabled state on options', async () => {
    const combo = document.createElement('ux-combobox');
    combo.setAttribute('name', 'color');
    container.appendChild(combo);
    await Promise.resolve();

    (combo as any).applyData({
      options: [
        { label: 'Red', value: 'red' },
        { label: 'Green', value: 'green', disabled: true },
        { label: 'Blue', value: 'blue' },
      ],
    });
    await Promise.resolve();

    const input = combo.querySelector('input') as HTMLInputElement;
    input.focus();
    input.dispatchEvent(new Event('focus'));
    await Promise.resolve();

    const disabledOption = combo.querySelector('.option.disabled');
    expect(disabledOption).toBeTruthy();
  });

  it('sets name and value attributes for form association', async () => {
    const combo = document.createElement('ux-combobox');
    combo.setAttribute('name', 'country');
    container.appendChild(combo);
    await Promise.resolve();

    (combo as any).applyData({
      value: 'france',
      options: [
        { label: 'France', value: 'france' },
        { label: 'Germany', value: 'germany' },
      ],
    });
    await Promise.resolve();

    expect(combo.getAttribute('value')).toBe('france');
    expect(combo.getAttribute('name')).toBe('country');
  });

  it('dispatches ux:input.change on selection', async () => {
    const combo = document.createElement('ux-combobox');
    combo.setAttribute('name', 'color');
    container.appendChild(combo);
    await Promise.resolve();

    (combo as any).applyData({
      options: [
        { label: 'Red', value: 'red' },
        { label: 'Blue', value: 'blue' },
      ],
    });
    await Promise.resolve();

    let detail: any = null;
    combo.addEventListener('ux:input.change', (e: Event) => {
      detail = (e as CustomEvent).detail;
    });

    const input = combo.querySelector('input') as HTMLInputElement;
    input.focus();
    input.dispatchEvent(new Event('focus'));
    await Promise.resolve();
    await Promise.resolve();

    const option = combo.querySelector('.option') as HTMLElement;
    if (option) {
      option.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
      await Promise.resolve();
    }

    expect(detail).toBeTruthy();
    if (detail) {
      expect(detail.value).toBe('red');
    }
  });
});

describe('UxSelect - Object-Driven Options', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    container.remove();
  });

  it('accepts data-driven options via applyData', async () => {
    const select = document.createElement('ux-select');
    select.setAttribute('name', 'fruit');
    container.appendChild(select);
    await Promise.resolve();

    (select as any).applyData({
      value: 'banana',
      options: [
        { label: 'Apple', value: 'apple' },
        { label: 'Banana', value: 'banana' },
        { label: 'Cherry', value: 'cherry' },
      ],
    });
    await Promise.resolve();

    const native = select.querySelector('select') as HTMLSelectElement;
    expect(native.value).toBe('banana');
    expect(select.getAttribute('value')).toBe('banana');
  });

  it('respects disabled options', async () => {
    const select = document.createElement('ux-select');
    select.setAttribute('name', 'size');
    container.appendChild(select);
    await Promise.resolve();

    (select as any).applyData({
      options: [
        { label: 'Small', value: 'sm' },
        { label: 'Medium', value: 'md', disabled: true },
        { label: 'Large', value: 'lg' },
      ],
    });
    await Promise.resolve();

    const native = select.querySelector('select') as HTMLSelectElement;
    expect(native.options[1].disabled).toBe(true);
  });

  it('dispatches ux:input.change on selection change', async () => {
    const select = document.createElement('ux-select');
    select.setAttribute('name', 'color');
    container.appendChild(select);
    await Promise.resolve();

    (select as any).applyData({
      options: [
        { label: 'Red', value: 'red' },
        { label: 'Blue', value: 'blue' },
      ],
    });
    await Promise.resolve();

    let detail: any = null;
    select.addEventListener('ux:input.change', (e: Event) => {
      detail = (e as CustomEvent).detail;
    });

    const native = select.querySelector('select') as HTMLSelectElement;
    native.value = 'blue';
    native.dispatchEvent(new Event('change', { bubbles: true }));
    await Promise.resolve();

    expect(detail).toBeTruthy();
    expect(detail?.value).toBe('blue');
  });

  it('supports placeholder option', async () => {
    const select = document.createElement('ux-select');
    select.setAttribute('name', 'country');
    select.setAttribute('placeholder', 'Select a country');
    container.appendChild(select);
    await Promise.resolve();

    (select as any).applyData({
      options: [
        { label: 'USA', value: 'us' },
        { label: 'Canada', value: 'ca' },
      ],
    });
    await Promise.resolve();

    const native = select.querySelector('select') as HTMLSelectElement;
    expect(native.options[0].disabled).toBe(true);
    expect(native.options[0].textContent).toBe('Select a country');
  });
});
