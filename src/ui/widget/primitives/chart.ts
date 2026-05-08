import { UxBase } from './base.js';

export class UxChart extends UxBase {
  private canvas: HTMLCanvasElement | null = null;
  private chart: unknown = null;
  private renderTimer: ReturnType<typeof setTimeout> | null = null;

  static get observedAttributes(): string[] {
    return ['data'];
  }

  protected onConnected(): void {
    super.onConnected();
    this.attachShadow({ mode: 'open' });
    if (!this.shadowRoot) return;
    this.shadowRoot.innerHTML = `
      <style>
        :host { display: block; height: var(--ux-chart-min-height, 260px); min-width: var(--ux-chart-min-width, 260px); position: relative; }
        canvas { width: 100% !important; height: 100% !important; display: block; }
      </style>
      <canvas part="canvas"></canvas>`;
    this.canvas = this.shadowRoot.querySelector('canvas');
    this.renderChart();
  }

  protected onDisconnected(): void {
    if (this.renderTimer) clearTimeout(this.renderTimer);
    this.destroyChart();
    super.onDisconnected();
  }

  protected onAttributeChanged(name: string): void {
    if (name === 'data') this.renderChart();
  }

  private async destroyChart() {
    if (!this.chart) return;
    const chart = this.chart instanceof Promise ? await this.chart : this.chart;
    if (chart && typeof (chart as any).destroy === 'function') {
      (chart as any).destroy();
    }
    this.chart = null;
  }

  private renderChart(): void {
    if (!this.canvas) return;
    this.destroyChart();

    const raw = this.getAttribute('data') || '';
    const values = raw.split(',').map(Number).filter(n => !isNaN(n));
    if (values.length === 0) {
      this.canvas.style.display = 'none';
      return;
    }
    this.canvas.style.display = '';

    this.tryCreateChart(values);
  }

  private tryCreateChart(values: number[], retries = 0): void {
    const chartTypeMap: Record<string, string> = {
      'ux-chart-line': 'line',
      'ux-chart-bar': 'bar',
      'ux-chart-donut': 'doughnut',
    };
    const chartType = chartTypeMap[this.localName] || this.getAttribute('type') || 'bar';
    const label = this.textContent?.trim() || this.getAttribute('label') || '';

    const app = (window as any).__ux3App;
    const chartService = app?.services?.chart;

    if (!chartService) {
      if (retries < 50) {
        this.renderTimer = setTimeout(() => this.tryCreateChart(values, retries + 1), 100);
      }
      return;
    }

    chartService.create(this.canvas, {
      type: chartType,
      data: {
        labels: values.map((_, i) => String(i + 1)),
        datasets: [{
          label,
          data: values,
          borderColor: chartType === 'line' ? '#3b82f6' : undefined,
          backgroundColor: chartType === 'doughnut'
            ? ['#3b82f6', '#ef4444', '#22c55e', '#eab308', '#8b5cf6', '#ec4899']
            : '#3b82f680',
        }],
      },
    }).then((instance: unknown) => {
      this.chart = instance;
    }).catch((err: unknown) => {
      this.dispatchEvent(new CustomEvent('ux:chart-error', {
        bubbles: true,
        detail: { error: err instanceof Error ? err.message : String(err) },
      }));
    });
  }
}
