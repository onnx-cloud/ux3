# @ux3/plugin-tailwind-plus

Production plugin for integrating official Tailwind Plus widgets into UX3.
This package does not ship demo widgets, placeholder templates, or hardcoded
FSM/widget/route assumptions.

## Features

* Registers optional Tailwind browser/style asset from plugin config.
* Exposes deterministic helper utilities in `app.utils.tailwindPlus`:
  * `mergeClasses`
  * `isOfficialTailwindPlusSource`
  * `normalizeTailwindPlusWidgets`
  * `registerOfficialTailwindPlusWidgets`
* Registers only explicitly configured widgets whose `source` is an official
  Tailwind Plus URL (`https://tailwindcss.com/plus/...`).

## Configuration

```yaml
plugins:
  - name: '@ux3/plugin-tailwind-plus'
    config:
      css: 'https://cdn.jsdelivr.net/npm/@tailwindcss/browser@4'
      widgets:
        - id: marketing.hero.centered
          source: 'https://tailwindcss.com/plus/ui-blocks/marketing/sections/heroes'
          template: |
            <section class="bg-white">
              <div class="mx-auto max-w-7xl px-6 py-24">...</div>
            </section>
          route: '/marketing/hero'
```

Widget fields:

* `id`: stable identifier used to derive default view name.
* `source`: must be official Tailwind Plus URL.
* `template`: UX3 template copied/adapted from the official block.
* `view` (optional): explicit view name. Defaults to `tailwind-plus-<id>`.
* `route` (optional): route path to map to the widget view.

### Installation

```bash
npm install @ux3/plugin-tailwind-plus
```
