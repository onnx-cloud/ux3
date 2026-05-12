import { describe, it, expect } from 'vitest';
import { interpolate, interpolatePath } from '../../src/core/interpolator';
import type { ScaffoldContext } from '../../src/types';

describe('interpolator', () => {
  const ctx: ScaffoldContext = {
    name: 'my-view',
    Name: 'MyView',
    name_snake: 'my_view',
    NAME: 'MY_VIEW',
    year: '2026',
    date: '2026-05-13',
    ux3Version: '1.0.0',
  };

  it('replaces [[ TOKEN ]] placeholders', () => {
    const template = 'const [[ Name ]] = "[[ name ]]"';
    const result = interpolate(template, ctx);
    expect(result).toBe('const MyView = "my-view"');
  });

  it('leaves {{ }} untouched (UX3 runtime syntax)', () => {
    const template = 'const val = {{ state.count }}';
    const result = interpolate(template, ctx);
    expect(result).toBe('const val = {{ state.count }}');
  });

  it('handles missing tokens', () => {
    const template = 'const x = [[ missing ]]';
    const result = interpolate(template, ctx);
    expect(result).toBe('const x = [[missing]]');
  });

  it('interpolatePath works for paths', () => {
    const path = 'src/[[ name ]]/[[ name ]].ts';
    const result = interpolatePath(path, ctx);
    expect(result).toBe('src/my-view/my-view.ts');
  });
});
