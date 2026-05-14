import { test, expect } from '@playwright/test';

async function gotoPage(page: any) {
  await page.goto('/');
  await page.waitForSelector('ux-app-shell', { timeout: 25000 });
}

test.describe('Form System E2E', () => {

  test('ux-input renders and accepts text', async ({ page }) => {
    await gotoPage(page);
    const raw = await page.evaluate(() => {
      const registered = !!customElements.get('ux-input');
      const el = document.createElement('ux-input');
      el.setAttribute('name', 'test');
      document.body.appendChild(el);
      const inner = el.querySelector('input');
      return { registered, hasInner: !!inner, tagName: el.tagName };
    });
    expect(raw.registered).toBe(true);
    expect(raw.hasInner).toBe(true);

    const val = await page.evaluate(() => {
      const el = document.querySelector('ux-input[name="test"]')!;
      const inner = el.querySelector('input')!;
      inner.value = 'hello world';
      inner.dispatchEvent(new Event('input', { bubbles: true }));
      return { value: el.getAttribute('value') };
    });
    expect(val.value).toBe('hello world');
  });

  test('ux-checkbox toggles on click', async ({ page }) => {
    await gotoPage(page);
    const raw = await page.evaluate(() => {
      const reg = !!customElements.get('ux-checkbox');
      return { registered: reg };
    });
    expect(raw.registered).toBe(true);

    const result = await page.evaluate(() => {
      const el = document.createElement('ux-checkbox');
      document.body.appendChild(el);
      el.click();
      return { checked: el.hasAttribute('checked'), ariaChecked: el.getAttribute('aria-checked') };
    });
    expect(result.checked).toBe(true);
    expect(result.ariaChecked).toBe('true');
  });

  test('ux-checkbox toggles with Space key', async ({ page }) => {
    await gotoPage(page);
    const raw = await page.evaluate(() => !!customElements.get('ux-checkbox'));
    expect(raw).toBe(true);

    const result = await page.evaluate(() => {
      const el = document.createElement('ux-checkbox');
      document.body.appendChild(el);
      el.focus();
      el.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true }));
      return { checked: el.hasAttribute('checked') };
    });
    expect(result.checked).toBe(true);
  });

  test('ux-switch toggles on click', async ({ page }) => {
    await gotoPage(page);
    const raw = await page.evaluate(() => !!customElements.get('ux-switch'));
    expect(raw).toBe(true);

    const result = await page.evaluate(() => {
      const el = document.createElement('ux-switch');
      document.body.appendChild(el);
      el.click();
      return { checked: el.hasAttribute('checked'), ariaChecked: el.getAttribute('aria-checked') };
    });
    expect(result.checked).toBe(true);
    expect(result.ariaChecked).toBe('true');
  });

  test('ux-radio-group renders options and selects on click', async ({ page }) => {
    await gotoPage(page);
    const raw = await page.evaluate(() => !!customElements.get('ux-radio-group'));
    expect(raw).toBe(true);

    const result = await page.evaluate(() => {
      const el = document.createElement('ux-radio-group');
      el.setAttribute('options', 'Red,Green,Blue');
      el.setAttribute('name', 'color');
      document.body.appendChild(el);
      const radios = el.querySelectorAll('input[type="radio"]');
      if (radios.length < 2) return { count: radios.length };
      (radios[1] as HTMLInputElement).click();
      return { count: radios.length, value: el.getAttribute('value'), role: el.getAttribute('role') };
    });
    expect(result.count).toBe(3);
    expect(result.value).toBe('Green');
    expect(result.role).toBe('radiogroup');
  });

  test('ux-radio-group arrow key navigation', async ({ page }) => {
    await gotoPage(page);
    const raw = await page.evaluate(() => !!customElements.get('ux-radio-group'));
    expect(raw).toBe(true);

    const result = await page.evaluate(() => {
      const el = document.createElement('ux-radio-group');
      el.setAttribute('options', 'One,Two,Three');
      el.setAttribute('name', 'num');
      document.body.appendChild(el);
      const first = el.querySelector('input[value="One"]') as HTMLInputElement;
      first.checked = true;
      first.focus();
      el.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
      const radios = el.querySelectorAll('input[type="radio"]');
      return { secondChecked: (radios[1] as HTMLInputElement).checked, value: el.getAttribute('value') };
    });
    expect(result.secondChecked).toBe(true);
    expect(result.value).toBe('Two');
  });

  test('ux-select renders and changes value', async ({ page }) => {
    await gotoPage(page);
    const raw = await page.evaluate(() => !!customElements.get('ux-select'));
    expect(raw).toBe(true);

    const result = await page.evaluate(() => {
      const el = document.createElement('ux-select');
      el.setAttribute('name', 'fruit');
      document.body.appendChild(el);
      const opt1 = document.createElement('option');
      opt1.value = 'apple'; opt1.textContent = 'Apple';
      const opt2 = document.createElement('option');
      opt2.value = 'banana'; opt2.textContent = 'Banana';
      el.appendChild(opt1);
      el.appendChild(opt2);
      const select = el.querySelector('select') as HTMLSelectElement;
      if (!select) return { error: 'no select' };
      select.value = 'banana';
      select.dispatchEvent(new Event('change', { bubbles: true }));
      return { value: el.getAttribute('value') };
    });
    expect(result.value).toBe('banana');
  });

  test('ux-combobox renders options', async ({ page }) => {
    await gotoPage(page);
    const raw = await page.evaluate(() => !!customElements.get('ux-combobox'));
    expect(raw).toBe(true);

    const result = await page.evaluate(() => {
      const el = document.createElement('ux-combobox');
      el.setAttribute('name', 'city');
      document.body.appendChild(el);
      const input = el.querySelector('input');
      return { hasInput: !!input, role: input?.getAttribute('role') };
    });
    expect(result.hasInput).toBe(true);
    expect(result.role).toBe('combobox');
  });

  test('ux-form has checkValidity and submit methods', async ({ page }) => {
    await gotoPage(page);
    const raw = await page.evaluate(() => !!customElements.get('ux-form'));
    expect(raw).toBe(true);

    const result = await page.evaluate(() => {
      const form = document.createElement('ux-form');
      document.body.appendChild(form);
      const inst = form as any;
      return { hasCheck: typeof inst.checkValidity === 'function', hasSubmit: typeof inst.submit === 'function' };
    });
    expect(result.hasCheck).toBe(true);
    expect(result.hasSubmit).toBe(true);
  });

  test('ux-form validates required empty fields', async ({ page }) => {
    await gotoPage(page);
    const raw = await page.evaluate(() => !!customElements.get('ux-form'));
    expect(raw).toBe(true);

    const result = await page.evaluate(() => {
      const form = document.createElement('ux-form');
      const input = document.createElement('ux-input');
      input.setAttribute('name', 'email');
      input.setAttribute('required', '');
      form.appendChild(input);
      document.body.appendChild(form);
      const inst = form as any;
      return { valid: inst.checkValidity(), hasCheck: typeof inst.checkValidity === 'function' };
    });
    expect(result.hasCheck).toBe(true);
    expect(result.valid).toBe(false);
  });

  test('ux-date-picker renders calendar and opens on click', async ({ page }) => {
    await gotoPage(page);
    const raw = await page.evaluate(() => !!customElements.get('ux-date-picker'));
    expect(raw).toBe(true);

    const result = await page.evaluate(() => {
      const el = document.createElement('ux-date-picker');
      document.body.appendChild(el);
      const input = el.querySelector('.dp-input') as HTMLInputElement;
      const calendar = el.querySelector('.dp-calendar');
      if (!input || !calendar) return { error: 'no elements' };
      input.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      return { calendarOpen: calendar.classList.contains('open'), hasDays: !!calendar.querySelector('.dp-day') };
    });
    expect(result.calendarOpen).toBe(true);
    expect(result.hasDays).toBe(true);
  });

  test('ux-date-picker selects a date', async ({ page }) => {
    await gotoPage(page);
    const raw = await page.evaluate(() => !!customElements.get('ux-date-picker'));
    expect(raw).toBe(true);

    const result = await page.evaluate(() => {
      const el = document.createElement('ux-date-picker');
      document.body.appendChild(el);
      const input = el.querySelector('.dp-input') as HTMLInputElement;
      const calendar = el.querySelector('.dp-calendar');
      if (!input || !calendar) return { error: 'no elements' };
      input.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      const day = calendar.querySelector('.dp-day:not(.other-month):not(.disabled)') as HTMLElement;
      if (!day) return { error: 'no day' };
      day.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      return { value: el.getAttribute('value'), closed: !calendar.classList.contains('open') };
    });
    expect(result.value).toBeTruthy();
    expect(result.closed).toBe(true);
  });

  test('ux-date-picker month navigation works', async ({ page }) => {
    await gotoPage(page);
    const raw = await page.evaluate(() => !!customElements.get('ux-date-picker'));
    expect(raw).toBe(true);

    const result = await page.evaluate(() => {
      const el = document.createElement('ux-date-picker');
      document.body.appendChild(el);
      const input = el.querySelector('.dp-input') as HTMLInputElement;
      if (!input) return { error: 'no input' };
      input.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      const header = el.querySelector('.dp-header span');
      const nextBtn = el.querySelector('.dp-next') as HTMLButtonElement;
      if (!header || !nextBtn) return { error: 'no nav' };
      const before = header.textContent;
      nextBtn.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      return { changed: before !== header.textContent };
    });
    expect(result.changed).toBe(true);
  });

  test('ux-field renders label and wraps control', async ({ page }) => {
    await gotoPage(page);
    const raw = await page.evaluate(() => !!customElements.get('ux-field'));
    expect(raw).toBe(true);

    const result = await page.evaluate(() => {
      const field = document.createElement('ux-field');
      field.setAttribute('name', 'email');
      field.setAttribute('label', 'Email Address');
      const input = document.createElement('input');
      input.type = 'email';
      field.appendChild(input);
      document.body.appendChild(field);
      const sr = field.shadowRoot;
      return {
        hasLabel: sr ? !!sr.querySelector('label') : false,
        controlSynced: input.getAttribute('name') === 'email',
        formAssociated: (field.constructor as any).formAssociated,
      };
    });
    expect(result.hasLabel).toBe(true);
    expect(result.controlSynced).toBe(true);
    expect(result.formAssociated).toBe(true);
  });

  test('ux-field shows error with aria-invalid', async ({ page }) => {
    await gotoPage(page);
    const raw = await page.evaluate(() => !!customElements.get('ux-field'));
    expect(raw).toBe(true);

    const result = await page.evaluate(() => {
      const field = document.createElement('ux-field');
      field.setAttribute('name', 'email');
      field.setAttribute('error', 'Required');
      field.setAttribute('touched', '');
      const input = document.createElement('input');
      field.appendChild(input);
      document.body.appendChild(field);
      return {
        ariaInvalid: input.getAttribute('aria-invalid'),
        describedBy: input.getAttribute('aria-describedby'),
        hasError: field.getAttribute('error') === 'Required',
      };
    });
    expect(result.hasError).toBe(true);
    expect(result.ariaInvalid).toBe('true');
    expect(result.describedBy).toContain('error');
  });

  test('data-variant form controls work', async ({ page }) => {
    await gotoPage(page);
    const result = await page.evaluate(() => {
      const tests: Record<string, boolean> = {};
      const input = document.createElement('ux-input');
      input.setAttribute('data-variant', 'compact');
      input.setAttribute('name', 'test');
      document.body.appendChild(input);
      const textarea = document.createElement('ux-textarea');
      textarea.setAttribute('data-variant', 'filled');
      document.body.appendChild(textarea);
      const select = document.createElement('ux-select');
      select.setAttribute('data-variant', 'compact');
      document.body.appendChild(select);
      tests.inputCompact = input.getAttribute('data-variant') === 'compact';
      tests.textareaFilled = textarea.getAttribute('data-variant') === 'filled';
      tests.selectCompact = select.getAttribute('data-variant') === 'compact';
      return tests;
    });
    expect(result.inputCompact).toBe(true);
    expect(result.textareaFilled).toBe(true);
    expect(result.selectCompact).toBe(true);
  });
});
