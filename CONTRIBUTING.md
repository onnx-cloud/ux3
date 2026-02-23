# Contributing to UX3

## Development Setup

### Prerequisites
- Node.js 18+
- pnpm 8+

### Installation

```bash
git clone https://github.com/onnx-cloud/ux3.git
cd ux3
pnpm install
```

### Development Workflow

1. Create a branch: `git checkout -b feature/my-feature`
2. Make changes in relevant packages
3. Run tests: `pnpm test`
4. Run lint: `pnpm lint`
5. Commit: `git commit -m "feat: description"`
6. Push and open a PR

### Running Tests

```bash
# Run all tests
pnpm test

# Watch mode
pnpm test:watch

# Single package
pnpm -F @ux3/core test
```

### Building

```bash
# Build all packages
pnpm build

# Build single package
pnpm -F @ux3/stdlib build
```

### Code Quality

```bash
# Type checking
pnpm type-check

# Linting
pnpm lint

# Format code (add script if using Prettier)
pnpm format
```

## Package Guidelines

### Adding a New Widget

1. Create in `packages/stdlib/src/primitives|compositions|layouts`
2. Extend `Widget` class
3. Implement `buildHTML()`
4. Add TypeScript types
5. Export in `index.ts`
6. Add tests in `tests/`
7. Update `README.md`

### Adding a New Plugin

1. Create package in `packages/`
2. Follow TypeScript setup
3. Export public API in `src/index.ts`
4. Add tests
5. Document in main README

## Commit Messages

Use conventional commits:
- `feat:` - New feature
- `fix:` - Bug fix
- `docs:` - Documentation
- `test:` - Tests
- `chore:` - Maintenance
- `refactor:` - Code reorganization

Example: `feat(core): add widget memoization`

## PR Process

1. Update relevant documentation
2. Add tests for new features
3. Ensure all tests pass
4. Request review from maintainers

## Code Style

- TypeScript strict mode
- ESLint configuration must pass
- No `any` types (use `unknown` or generics)
- Comments for complex logic
- Exported APIs should have JSDoc

## Performance

All code should:
- Keep bundle sizes in check
- Minimize runtime overhead
- Use tree-shaking friendly exports
- Avoid unnecessary dependencies

## Help Needed

See [TODO.md](TODO.md) and [IDEAS.md](IDEAS.md) for opportunities to contribute!
