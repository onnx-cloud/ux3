# Tailwind CSS HTML Injection - Fix Summary

## Problem
Tailwind CSS was declared in `ux3.yaml` plugin configuration but **was NOT being injected into the HTML output**. The CSS framework link was missing from the `<head>` section, causing unstyled applications.

## Root Cause
The build pipeline was not executing plugin `install()` methods to extract and register CSS assets during the configuration generation phase. Plugin asset registration only happened at runtime in the browser, not at build time.

## Solution Implemented

### 1. **Plugin Asset Extraction in ConfigGenerator** (`src/build/config-generator.ts`)
- Added plugin asset extraction logic to parse `ux3.yaml` plugin declarations
- For each declared plugin, extract the configured CSS URL and store in `config.site.assets`
- Supports hardcoded asset configurations for known CSS framework plugins:
  - `@ux3/plugin-tailwind-css` - uses `config.cdn` or default CDN
  - `@ux3/plugin-tailwind-plus` - uses `config.css` or default CDN  
  - `@ux3/plugin-bootstrap` - uses Bootstrap CDN
  - `@ux3/plugin-bulma` - uses Bulma CDN

### 2. **HTML Asset Injection** (`src/dev/asset-processor.ts`)
- The existing `processAssets()` function already reads `config.site.assets`
- Assets are injected into the HTML `<head>` section during dev server rendering
- Works seamlessly with existing asset injection pipeline

### 3. **Backward Compatibility**
- Changes are purely additive - no breaking changes
- Existing projects without plugins continue to work unchanged
- Projects that manually define `site.assets` in YAML are still supported

## Code Changes

### Modified Files
1. **`src/build/config-generator.ts`**
   - Lines 284-318: Added plugin asset extraction logic
   - Parses `top.plugins` from `ux3.yaml`
   - Stores extracted assets in `config.site.assets`

### New Files Created
1. **`tests/build/config-generator-tailwind.test.ts`** - 6 comprehensive unit tests:
   - Extract plugin assets from ux3.yaml
   - Handle missing/unavailable plugins gracefully
   - Merge multiple plugin assets
   - Preserve non-plugin site config
   - Skip plugins without CSS assets
   - Support custom Tailwind CSS CDN URLs

## Testing

### Unit Tests (All Passing ✅)
```
✓ tests/build/config-generator-tailwind.test.ts (6 tests) 227ms
✓ tests/build/config-generator.test.ts (2 tests) 151ms
✓ tests/build/ (261 tests total) - All passing
```

### Integration Test
Verified Tailwind CSS link appears in HTML output:
```bash
$ npm run dev --port 3456
$ curl http://localhost:3456/ | grep tailwind
# Output: <link rel="stylesheet" href="https://cdn.tailwindcss.com">
```

## User Impact

### Before Fix
```html
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <!-- NO Tailwind CSS link! -->
  </head>
  <body>
    <div id="app"></div>
  </body>
</html>
```

### After Fix
```html
<!DOCTYPE html>
<html>
  <head>
    <meta charset="UTF-8" />
    <!-- ✅ Tailwind CSS automatically injected -->
    <link rel="stylesheet" href="https://cdn.tailwindcss.com">
  </head>
  <body>
    <div id="app"></div>
  </body>
</html>
```

## How It Works

### Configuration Flow
1. **Build Time** (`npm run build` or dev watch)
   - ConfigGenerator reads `ux3.yaml` plugins
   - For each CSS framework plugin, extract asset URL
   - Store in generated `config.ts` as `config.site.assets`

2. **Dev Server Start** (or HTML generation)
   - `asset-processor.ts` reads `config.site.assets`  
   - Generates `<link>` tags for each stylesheet
   - Injects into HTML `<head>` section

3. **Browser Receives**
   - Complete HTML with all CSS frameworks loaded
   - Styles available immediately on page load

## Supported Plugins

| Plugin | Asset Type | Config Key | Default |
|--------|-----------|-----------|---------|
| `@ux3/plugin-tailwind-css` | CSS | `cdn` | `https://cdn.tailwindcss.com` |
| `@ux3/plugin-tailwind-plus` | CSS | `css` | `https://cdn.tailwindcss.com` |
| `@ux3/plugin-bootstrap` | CSS | `cdn` | Bootstrap CDN |
| `@ux3/plugin-bulma` | CSS | `cdn` | Bulma CDN |

## Adding Custom Plugins

To add a new CSS framework plugin to the asset extraction list:

```typescript
// In src/build/config-generator.ts, add to the plugin loop:
} else if (pluginName === '@ux3/plugin-my-framework') {
  const cssUrl = (pluginConfig.config as any)?.cdn || 'https://my-cdn.com/style.css';
  assets.push({
    type: 'style',
    href: cssUrl,
  });
}
```

## Files Modified
- `src/build/config-generator.ts` - Plugin asset extraction
- `tests/build/config-generator-tailwind.test.ts` - New comprehensive tests

## Verification Steps Completed
✅ Unit tests pass (6/6)  
✅ All build tests pass (261/261)  
✅ No regressions in existing functionality  
✅ Tailwind CSS appears in HTML output  
✅ Custom CDN URLs are respected  
✅ Multiple plugins handled correctly  
✅ Missing/unavailable plugins handled gracefully  

## Related Documentation
- Build system: [docs/compilation.md](../docs/compilation.md)
- Asset management: [src/dev/asset-processor.ts](../src/dev/asset-processor.ts)
- Plugin system: [src/plugin/registry.ts](../src/plugin/registry.ts)
