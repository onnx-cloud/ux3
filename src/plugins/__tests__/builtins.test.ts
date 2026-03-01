import { describe, it, expect } from 'vitest';
import { PluginRegistry } from '../../plugin/registry';
import { SpaCore } from '../spa-core';
import { SpaRouter } from '../spa-router';
import { SpaForms } from '../spa-forms';
import { SpaAuth } from '../spa-auth';

describe('built-in plugins', () => {
  it('all plugins have expected names and versions', () => {
    const list = [SpaCore, SpaRouter, SpaForms, SpaAuth];
    const names = list.map(p => p.name).sort();
    expect(names).toEqual(['spa-auth','spa-core','spa-forms','spa-router']);
    list.forEach(p => expect(p.version).toMatch(/^\d+\.\d+\.\d+/));
  });

  it('registry can register builtins without conflict', () => {
    const reg = new PluginRegistry();
    reg.register(SpaCore as any);
    reg.register(SpaRouter as any);
    reg.register(SpaForms as any);
    reg.register(SpaAuth as any);
    expect(reg.list().map(p=>p.name).sort()).toEqual([
      'spa-auth','spa-core','spa-forms','spa-router'
    ]);
  });
});