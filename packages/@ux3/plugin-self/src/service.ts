import * as fs from 'fs';
import * as path from 'path';
import type { AppContext } from '../../../../src/ui/app.js';

export interface SelfServiceConfig {
  onboarded?: boolean;
  ready?: boolean;
  onboardingStep?: string;
}

interface OnboardingAssets {
  widgetYaml: string;
  welcomeHtml: string;
  detailsHtml: string;
  reviewHtml: string;
  completeHtml: string;
}

function buildOnboardingAssets(projectName: string): OnboardingAssets {
  return {
    widgetYaml: `name: self-onboarding
layout: default
initial: welcome
context:
  projectName: "${projectName}"
  template: app
  port: "1337"
  host: localhost
  ready: false
  onboarded: false
  onboardingStep: welcome
states:
  welcome:
    template: widget/self-onboarding/welcome.html
    on:
      START:
        target: details
  details:
    template: widget/self-onboarding/details.html
    on:
      NEXT:
        target: review
  review:
    template: widget/self-onboarding/review.html
    on:
      CONFIRM:
        target: complete
      EDIT:
        target: details
  complete:
    template: widget/self-onboarding/complete.html
    on:
      RESTART:
        target: welcome
`,
    welcomeHtml: `<div class="view-self-onboarding">
  <h1>Welcome to UX3 Self</h1>
  <p>Use this wizard to configure a self-hosted development shell for UX3.</p>
  <button ux-event="START">Begin onboarding</button>
</div>
`,
    detailsHtml: `<div class="view-self-onboarding">
  <h2>Project details</h2>
  <form ux-event="submit:NEXT" ux-prevent-default="true">
    <label>
      Project name
      <input name="projectName" data-bind="projectName" type="text" required />
    </label>
    <label>
      Template
      <input name="template" data-bind="template" type="text" required />
    </label>
    <label>
      Host
      <input name="host" data-bind="host" type="text" required />
    </label>
    <label>
      Port
      <input name="port" data-bind="port" type="number" required />
    </label>
    <div class="actions">
      <button type="submit">Review configuration</button>
    </div>
  </form>
</div>
`,
    reviewHtml: `<div class="view-self-onboarding">
  <h2>Review configuration</h2>
  <dl>
    <dt>Project name</dt><dd><span data-bind="projectName"></span></dd>
    <dt>Template</dt><dd><span data-bind="template"></span></dd>
    <dt>Host</dt><dd><span data-bind="host"></span></dd>
    <dt>Port</dt><dd><span data-bind="port"></span></dd>
  </dl>
  <div class="actions">
    <button ux-event="click:EDIT">Edit details</button>
    <button ux-event="click:CONFIRM" ux-event-value='{ "ready": true, "onboarded": true }'>Confirm and finish</button>
  </div>
</div>
`,
    completeHtml: `<div class="view-self-onboarding">
  <h2>All set!</h2>
  <p>Your self-hosted UX3 app has been configured.</p>
  <p>Open <a href="/self">this onboarding page</a> again anytime.</p>
  <button ux-event="RESTART">Restart onboarding</button>
</div>
`,
  };
}

export class SelfService {
  private projectDir: string;
  private app?: AppContext;

  constructor(config: SelfServiceConfig = {}, app?: AppContext) {
    this.config = config;
    this.app = app;
    this.projectDir = process.cwd();
  }

  private config: SelfServiceConfig;

  getInfo() {
    return {
      name: '@ux3/plugin-self',
      version: '0.1.0',
      onboarded: !!this.config.onboarded,
      ready: !!this.config.ready,
      onboardingStep: this.config.onboardingStep ?? 'welcome',
      projectDir: this.projectDir,
      plugins: this.listPluginNames(),
    };
  }

  getStatus() {
    return {
      onboarded: !!this.config.onboarded,
      ready: !!this.config.ready,
      onboardingStep: this.config.onboardingStep ?? 'welcome',
      hasOnboardingView: fs.existsSync(path.join(this.projectDir, 'ux', 'widget', 'self-onboarding.yaml')),
      hasSelfRoute: fs.existsSync(path.join(this.projectDir, 'ux', 'route', 'routes.yaml')) &&
        fs.readFileSync(path.join(this.projectDir, 'ux', 'route', 'routes.yaml'), 'utf-8').includes('path: /self'),
      hasSelfPlugin: this.isSelfPluginInstalled(),
    };
  }

  async writeEnv(values: Record<string, string>) {
    const envPath = path.join(this.projectDir, '.env');
    let existing = '';

    if (fs.existsSync(envPath)) {
      existing = fs.readFileSync(envPath, 'utf-8');
    }

    const lines = existing
      .split(/\r?\n/)
      .filter((line) => line.trim().length > 0 && !line.trim().startsWith('#'));

    const existingMap = new Map<string, string>();
    for (const line of lines) {
      const [key, ...rest] = line.split('=');
      if (!key || rest.length === 0) continue;
      existingMap.set(key.trim(), rest.join('=').trim());
    }

    for (const [key, value] of Object.entries(values)) {
      existingMap.set(key, value);
    }

    const outputLines = [
      '# UX3 Self runtime configuration',
      ...Array.from(existingMap.entries()).map(([key, value]) => `${key}=${value}`),
    ];

    fs.writeFileSync(envPath, `${outputLines.join('\n')}\n`, 'utf-8');
    return { success: true, path: envPath };
  }

  async generateScaffold() {
    const widgetDir = path.join(this.projectDir, 'ux', 'widget', 'self-onboarding');
    const widgetYamlPath = path.join(this.projectDir, 'ux', 'widget', 'self-onboarding.yaml');
    const routePath = path.join(this.projectDir, 'ux', 'route', 'routes.yaml');
    const assets = buildOnboardingAssets(path.basename(this.projectDir) || 'ux3-self');

    fs.mkdirSync(widgetDir, { recursive: true });
    if (!fs.existsSync(widgetYamlPath)) {
      fs.writeFileSync(widgetYamlPath, assets.widgetYaml, 'utf-8');
    }

    fs.writeFileSync(path.join(widgetDir, 'welcome.html'), assets.welcomeHtml, 'utf-8');
    fs.writeFileSync(path.join(widgetDir, 'details.html'), assets.detailsHtml, 'utf-8');
    fs.writeFileSync(path.join(widgetDir, 'review.html'), assets.reviewHtml, 'utf-8');
    fs.writeFileSync(path.join(widgetDir, 'complete.html'), assets.completeHtml, 'utf-8');

    if (fs.existsSync(routePath)) {
      const routes = fs.readFileSync(routePath, 'utf-8');
      if (!routes.includes('path: /self')) {
        fs.writeFileSync(routePath, `${routes.trimEnd()}\n  - path: /self\n    view: self-onboarding\n    title: Self Onboarding\n`, 'utf-8');
      }
    } else {
      fs.mkdirSync(path.dirname(routePath), { recursive: true });
      fs.writeFileSync(routePath, `routes:\n  - path: /\n    view: hello\n    title: Home\n  - path: /self\n    view: self-onboarding\n    title: Self Onboarding\n`, 'utf-8');
    }

    return { success: true, projectDir: this.projectDir };
  }

  async verify() {
    const status = this.getStatus();
    const ux3ConfigPath = path.join(this.projectDir, 'ux3.config.json');
    return {
      projectDir: this.projectDir,
      routeFile: fs.existsSync(path.join(this.projectDir, 'ux', 'route', 'routes.yaml')),
      widgetFile: fs.existsSync(path.join(this.projectDir, 'ux', 'widget', 'self-onboarding.yaml')),
      configFile: fs.existsSync(ux3ConfigPath),
      status,
    };
  }

  async listPlugins() {
    return this.getPlugins();
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
    switch (name) {
      case 'self.info':
        return this.getInfo();
      case 'self.onboarding.status':
        return this.getStatus();
      case 'self.onboarding.step': {
        const step = typeof args.step === 'string' ? args.step : null;
        const action = typeof args.action === 'string' ? args.action : null;
        if (typeof args.onboarded === 'boolean') {
          this.config.onboarded = args.onboarded;
        }
        if (typeof args.ready === 'boolean') {
          this.config.ready = args.ready;
        }
        if (step) {
          this.config.onboardingStep = step;
        }
        if (action === 'CONFIRM' || action === 'DONE') {
          this.config.onboarded = true;
          this.config.ready = true;
        }
        return { step, action, status: this.getStatus() };
      }
      case 'self.env.write':
        return this.writeEnv((args.env ?? {}) as Record<string, string>);
      case 'self.generate':
        return this.generateScaffold();
      case 'self.verify':
        return this.verify();
      case 'self.plugin.list':
        return this.listPlugins();
      default:
        throw new Error(`Unknown self MCP tool: ${name}`);
    }
  }

  async readResource(uri: string): Promise<string> {
    switch (uri) {
      case 'plugin://self/docs':
        return this.getDocs();
      case 'plugin://self/onboarding-schema':
        return JSON.stringify(this.getOnboardingSchema(), null, 2);
      default:
        throw new Error(`Unknown self MCP resource URI: ${uri}`);
    }
  }

  private getPlugins(): Array<{ name: string; config: unknown }> {
    const plugins = this.app?.config?.plugins;
    if (!plugins) return [];
    if (Array.isArray(plugins)) {
      return plugins.map((entry) => {
        if (typeof entry === 'string') {
          return { name: entry, config: {} };
        }
        return { name: entry?.name ?? 'unknown', config: entry };
      });
    }
    return Object.entries(plugins).map(([name, config]) => ({ name, config }));
  }

  private listPluginNames(): string[] {
    return this.getPlugins().map((entry) => entry.name);
  }

  private isSelfPluginInstalled(): boolean {
    const plugins = this.app?.config?.plugins;
    if (!plugins) return false;
    if (Array.isArray(plugins)) {
      return plugins.some((entry: any) => typeof entry === 'string' ? entry === '@ux3/plugin-self' : entry?.name === '@ux3/plugin-self');
    }
    return Object.prototype.hasOwnProperty.call(plugins, '@ux3/plugin-self');
  }

  private getDocs(): string {
    return `# @ux3/plugin-self\n\nSelf-hosted onboarding and runtime guidance for UX3. Use self tools to generate scaffolds, write environment configuration, and inspect project readiness.\n\n## Tools\n- self.info\n- self.onboarding.status\n- self.onboarding.step\n- self.env.write\n- self.generate\n- self.verify\n- self.plugin.list\n`;
  }

  private getOnboardingSchema() {
    return {
      type: 'object',
      properties: {
        projectName: { type: 'string' },
        template: { type: 'string' },
        port: { type: 'string' },
        host: { type: 'string' },
      },
      required: ['projectName', 'template'],
      additionalProperties: false,
    };
  }
}
