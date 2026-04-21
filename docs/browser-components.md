# Browser-Aware Built-In Components

Use these built-ins to make apps adapt to locale, theme, and network conditions without custom wiring.

Components covered:

- `ux-lang-switcher`
- `ux-theme-toggle`
- `ux-network-status`

---

## ux-lang-switcher

Renders a locale selector and updates `document.documentElement.lang` and `dir`.

### Basic

```html
<ux-lang-switcher></ux-lang-switcher>
```

### With explicit locale list

```html
<ux-lang-switcher locales="en,fr,de,ar"></ux-lang-switcher>
```

### With label and no persistence

```html
<ux-lang-switcher label="Locale" persist="false"></ux-lang-switcher>
```

### Events

```ts
const el = document.querySelector('ux-lang-switcher');
el?.addEventListener('ux:locale-change', (event) => {
  const locale = (event as CustomEvent).detail.locale;
  console.log('Locale changed:', locale);
});
```

Notes:

- Locale options resolve in this order:
  1. `locales` attribute
  2. `app.config.i18n` keys
  3. browser preferences
- When `persist` is enabled, selected locale is stored in `localStorage` as `ux3.locale`.

---

## ux-theme-toggle

Toggles light/dark theme by setting `document.documentElement.dataset.theme`.

### Basic

```html
<ux-theme-toggle></ux-theme-toggle>
```

### No persistence

```html
<ux-theme-toggle persist="false"></ux-theme-toggle>
```

### Events

```ts
const el = document.querySelector('ux-theme-toggle');
el?.addEventListener('ux:theme-change', (event) => {
  const theme = (event as CustomEvent).detail.theme;
  console.log('Theme changed:', theme);
});
```

Notes:

- Startup theme resolves in this order:
  1. persisted `ux3.theme`
  2. `theme` attribute
  3. `html[data-theme]`
  4. `prefers-color-scheme`
- When `persist` is enabled, theme is stored in `localStorage` as `ux3.theme`.

---

## ux-network-status

Displays current online/offline status and reacts to browser connectivity events.

### Basic

```html
<ux-network-status></ux-network-status>
```

### Events

```ts
const el = document.querySelector('ux-network-status');
el?.addEventListener('ux:change', (event) => {
  const online = (event as CustomEvent).detail.online;
  console.log('Online:', online);
});
```

---

## Example Header

```html
<header ux-style="topbar">
  <ux-network-status></ux-network-status>
  <ux-theme-toggle></ux-theme-toggle>
  <ux-lang-switcher locales="en,fr,de,ar"></ux-lang-switcher>
</header>
```

---

## Styling

These components are normal custom elements and can be styled with `ux-style` wrappers, CSS variables, or host selectors.

```css
ux-lang-switcher,
ux-theme-toggle,
ux-network-status {
  margin-inline: 0.25rem;
}
```
