# UX3 — A Lightweight Framework for Building Modern SPAs 🌟

UX3 is a tiny, zero‑dependency single‑page application framework designed for developers who value clarity, speed, and maintainability. 

At its core is a **configuration‑first philosophy**: you describe views, styles, validation rules, and even application logic in YAML/JSON rather than writing imperative code. The compiler does the heavy lifting, generating strongly‑typed components, validators and build artifacts so that most of your work happens before the browser even runs. 

It allows you to declare the structure of your app in YAML and HTML while the framework handles the wiring, state management, and type safety, keeping the surface area of handwritten JavaScript/TypeScript to an absolute minimum.

Whether you’re building an internal dashboard, a customer portal, or a full‑fledged public web app, UX3 gives you the tools to stay productive without sacrificing control. 

The core of UX3 is a small runtime coupled with a powerful compile‑time toolchain that generates strongly‑typed components, validators, and view logic — letting you catch errors before they reach the browser.

![ONNX.cloud](./onnx.cloud.logo.png)

---

## Why UX3?

* **Zero runtime dependencies** – the framework ships as a handful of kilobytes and works with plain HTML and TypeScript.
* **Config over code** – define UI, validation, styles, and text in declarative files; write behavioral code only when necessary.
* **Compile‑time guarantees** – schemas, view definitions, and templates are validated and type‑checked during build.
* **Modular by design** – organise your project by concern (`view`, `style`, `i18n`, etc.), not by feature, making it easy to scale and collaborate.
* **Built‑in state machines** – every view is an FSM; complex interactions are modelled declaratively and remain predictable.
* **Fully typed** – generated TypeScript interfaces for validation rules, API responses, and view parameters keep you in the editor with autocomplete.

---

## Key Concepts at a Glance

* **Views** – described in YAML with an `initial` state and optional `template`. They form the UI components of your app and drive rendering using finite state machines.
* **Templates** – HTML files with lightweight markers like `ux-state` and `ux-event` that connect UI to FSM states and events.
* **Styles** – all visual rules live in `ux/style/` and are referenced by widget name; variants are data‑driven.
* **Tokens** – design primitives (colors, spacing, typography) defined in YAML and consumed across styles.
* **Validation** – rules in `ux/validation/` with messages kept separately in `ux/i18n/` for translations.
* **i18n** – nested JSON files mirroring your route/view hierarchy; no strings in code.

---

## Getting Started

1. **Install**

   ```bash
   npm install ux3
   ```

2. **Create `ux/` folders**

   Start with `ux/view`, `ux/style`, `ux/validation`, `ux/i18n`, and `ux/token`.

3. **Write your first view**

   ```yaml
   # ux/view/login.yaml
   initial: idle
   states:
     idle: 'view/login/idle.html'
     submitting:
       template: 'view/login/submitting.html'
       invoke:
         src: submitLogin
       on:
         SUCCESS: success
         ERROR: idle
   ```

4. **Compile & build**

   ```bash
   npx ux3 compile --views ./ux/view --output ./src/generated
   npm run build
   ```

5. **Run tests** – Use `npm run test` for unit tests and `npm run test:e2e` for Playwright tests.

---

### ⚙️ CLI Command Reference

The `ux3` CLI drives the core workflow. Run it via `npx ux3` or add it to your `package.json` scripts.

* `ux3 build` – full pipeline (validate → compile → emit code). Equivalent to `npm run build`.
* `ux3 compile` – compile sources only. Useful during development: `npx ux3 compile --views ./ux/view --output ./src/generated`.
* `ux3 validate` – run the schema/logic validator without generating code.

Each command accepts a `--config` flag pointing at a `ux3.config.json` file, or you can supply paths individually (`--views`, `--output`, etc.).

> See the [documentation](docs/compilation.md#cli-commands) for complete options and examples.

---

## Learn More

* See the [docs folder](docs/README.md) for architecture deep dives and guides.
* Check out the `examples/` directory for working sample apps (`todo`, `iam`).
* Use `npm run dev` to start a live‑reload development server.

---

UX3 is intentionally small so you can stay focused on building features. Welcome to a new way of thinking about frontend development — where configuration is your source of truth and the compiler is your teammate. 🎯

