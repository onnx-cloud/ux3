# @ux3/ux-skeleton

Scaffolding and template tooling for UX3.

## Features

- Template-driven project and view scaffolding
- Context builders and template resolvers
- File emission utilities and path interpolation
- Pluggable casing, filtering, and transformer strategies

## Installation

```bash
npm install @ux3/ux-skeleton
```

## Basic Usage

```ts
import { scaffold } from '@ux3/ux-skeleton';

await scaffold({
  templateDir: 'templates',
  targetDir: 'src',
  context: { name: 'MyApp' },
});
```

## API

- `scaffold(config)` — run the scaffold pipeline.
- `buildContext(context)` — construct scaffold context.
- `resolveTemplateDir(path)` — resolve template directories.
- `interpolate(value, context)` — interpolate template strings.
- `emitFiles(files, targetDir)` — write generated files.
- `defaultCasingStrategy`, `defaultContextProvider`, `defaultFileFilter`, `defaultPathTransformer` — scaffold strategy exports.

## Example

```ts
import { scaffold, defaultFileFilter } from '@ux3/ux-skeleton';

await scaffold({
  templateDir: './templates',
  targetDir: './output',
  context: { projectName: 'UX3 App' },
  fileFilter: defaultFileFilter,
});
```

## Notes

- This package is intended for build-time scaffolding and code generation.
- Use the exported strategies to customize template resolution and output paths.
