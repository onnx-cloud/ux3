import { UxBase } from './base.js';

export class UxChart extends UxBase {
  private canvas: HTMLCanvasElement | null = null;
  private chart: unknown = null;
  private renderTimer: ReturnType<typeof setTimeout> | null = null;
  private animFrame = 0;

  static get observedAttributes(): string[] {
    return ['data', 'data-labels'];
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
    if (this.animFrame) cancelAnimationFrame(this.animFrame);
    this.destroyChart();
    super.onDisconnected();
  }

  protected onAttributeChanged(name: string): void {
    if (name === 'data' || name === 'data-labels') this.renderChart();
  }

  protected applyData(series: ChartSeriesData): void {
    if (!series) return;
    const values = series.values ?? [];
    const labels = series.labels ?? [];
    let changed = false;
    if (labels.length > 0) { this.setAttribute('data-labels', labels.join(',')); changed = true; }
    if (values.length > 0) { this.setAttribute('data', values.join(',')); changed = true; }
    if (!changed) this.renderChart();
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
    if (this.animFrame) { cancelAnimationFrame(this.animFrame); this.animFrame = 0; }

    const raw = this.getAttribute('data') || '';
    const values = raw.split(',').map(Number).filter(n => !isNaN(n));
    if (values.length === 0) {
      this.canvas.style.display = 'none';
      return;
    }
    this.canvas.style.display = '';

    const rawLabels = this.getAttribute('data-labels') || '';
    const labels = rawLabels.split(',').map(s => s.trim()).filter(Boolean);

    this.tryCreateChart(values, labels);
  }

  private tryCreateChart(values: number[], labels: string[], retries = 0): void {
    const chartTypeMap: Record<string, string> = {
      'ux-chart-line': 'line',
      'ux-chart-bar': 'bar',
      'ux-chart-donut': 'doughnut',
    };
    const chartType = chartTypeMap[this.localName] || this.getAttribute('type') || 'bar';
    const datasetLabel = this.textContent?.trim() || this.getAttribute('label') || '';

    const app = (window as any).__ux3App;
    const chartService = app?.services?.chart;

    if (!chartService) {
      if (retries < 3) {
        this.renderTimer = setTimeout(() => this.tryCreateChart(values, labels, retries + 1), 200);
      } else {
        this.renderFallback(chartType, values, labels, datasetLabel);
      }
      return;
    }

    const displayLabels = labels.length > 0 ? labels : values.map((_, i) => String(i + 1));

    chartService.create(this.canvas, {
      type: chartType,
      data: {
        labels: displayLabels,
        datasets: [{
          label: datasetLabel,
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
      this.renderFallback(chartType, values, labels, datasetLabel);
    });
  }

  private renderFallback(type: string, values: number[], labels: string[], _label: string): void {
    const canvas = this.canvas!;
    const dpr = typeof devicePixelRatio !== 'undefined' ? devicePixelRatio : 1;
    canvas.width = canvas.offsetWidth * dpr;
    canvas.height = canvas.offsetHeight * dpr;
    const ctx = canvas.getContext('2d')!;
    ctx.scale(dpr, dpr);

    const w = canvas.offsetWidth;
    const h = canvas.offsetHeight;
    if (w < 30 || h < 30) return;
    const pad = { top: 20, right: 20, bottom: 50, left: 50 };
    const cw = w - pad.left - pad.right;
    const ch = h - pad.top - pad.bottom;

    const displayLabels = labels.length > 0 ? labels : values.map((_, i) => String(i + 1));

    if (type === 'doughnut') {
      this.renderDonut(ctx, w, h, values, displayLabels);
      return;
    }

    if (type === 'line') {
      this.renderAxes(ctx, pad, w, h, cw, ch, values);
      this.animateLine(ctx, pad, w, h, cw, ch, values, displayLabels);
      return;
    }

    this.renderAxes(ctx, pad, w, h, cw, ch, values);
    this.animateBars(ctx, pad, w, h, cw, ch, values, displayLabels, type);
  }

  private renderAxes(ctx: CanvasRenderingContext2D, pad: any, w: number, h: number, cw: number, ch: number, values: number[]): void {
    ctx.clearRect(0, 0, w, h);
    ctx.strokeStyle = '#d1d5db';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(pad.left, pad.top);
    ctx.lineTo(pad.left, h - pad.bottom);
    ctx.lineTo(w - pad.right, h - pad.bottom);
    ctx.stroke();

    const maxVal = Math.max(...values, 1);
    const ticks = 4;
    for (let i = 0; i <= ticks; i++) {
      const y = pad.top + ch - (i / ticks) * ch;
      const val = Math.round((i / ticks) * maxVal);
      ctx.fillStyle = '#6b7280';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(String(val), pad.left - 6, y + 4);

      ctx.strokeStyle = '#f3f4f6';
      ctx.beginPath();
      ctx.moveTo(pad.left, y);
      ctx.lineTo(w - pad.right, y);
      ctx.stroke();
    }
  }

  private animateBars(ctx: CanvasRenderingContext2D, pad: any, w: number, h: number, cw: number, ch: number, values: number[], labels: string[], _type: string): void {
    const maxVal = Math.max(...values, 1);
    const barW = Math.max(4, (cw / values.length) * 0.7);
    const gap = (cw / values.length) * 0.3;
    const startTime = performance.now();
    const duration = 350;

    const frame = () => {
      const elapsed = performance.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);

      ctx.clearRect(pad.left, pad.top, cw, ch);

      for (let i = 0; i < values.length; i++) {
        const x = pad.left + i * (cw / values.length) + gap / 2;
        const barH = (values[i] / maxVal) * ch * eased;
        ctx.fillStyle = '#3b82f680';
        ctx.fillRect(x, pad.top + ch - barH, barW, barH);

        if (eased > 0.1) {
          ctx.fillStyle = '#374151';
          ctx.font = '10px sans-serif';
          ctx.textAlign = 'center';
          ctx.fillText(labels[i] || '', x + barW / 2, h - pad.bottom + 16);
        }
      }

      if (progress < 1) {
        this.animFrame = requestAnimationFrame(frame);
      } else {
        this.animFrame = 0;
      }
    };
    this.animFrame = requestAnimationFrame(frame);
  }

  private animateLine(ctx: CanvasRenderingContext2D, pad: any, w: number, h: number, cw: number, ch: number, values: number[], labels: string[]): void {
    const maxVal = Math.max(...values, 1);
    const startTime = performance.now();
    const duration = 500;

    const frame = () => {
      const elapsed = performance.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const visibleCount = Math.ceil(values.length * progress);

      ctx.clearRect(pad.left, pad.top, cw, ch);

      if (visibleCount >= 2) {
        ctx.strokeStyle = '#3b82f6';
        ctx.lineWidth = 2;
        ctx.lineJoin = 'round';
        ctx.beginPath();
        for (let i = 0; i < visibleCount; i++) {
          const x = pad.left + i * (cw / (values.length - 1 || 1));
          const y = pad.top + ch - (values[i] / maxVal) * ch;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      }

      ctx.fillStyle = '#3b82f6';
      for (let i = 0; i < visibleCount; i++) {
        const x = pad.left + i * (cw / (values.length - 1 || 1));
        const y = pad.top + ch - (values[i] / maxVal) * ch;
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fill();
      }

      for (let i = 0; i < labels.length && i < visibleCount; i++) {
        ctx.fillStyle = '#374151';
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(labels[i] || '', pad.left + i * (cw / (values.length - 1 || 1)), h - pad.bottom + 16);
      }

      if (progress < 1) {
        this.animFrame = requestAnimationFrame(frame);
      } else {
        this.animFrame = 0;
      }
    };
    this.animFrame = requestAnimationFrame(frame);
  }

  private renderDonut(ctx: CanvasRenderingContext2D, w: number, h: number, values: number[], _labels: string[]): void {
    ctx.clearRect(0, 0, w, h);
    const cx = w / 2, cy = h / 2;
    const outerR = Math.min(w, h) / 2 - 20;
    if (outerR <= 0) return;
    const innerR = outerR * 0.6;
    const total = values.reduce((a, b) => a + b, 0);
    const colors = ['#3b82f6', '#ef4444', '#22c55e', '#eab308', '#8b5cf6', '#ec4899'];

    let startAngle = -Math.PI / 2;
    const startTime = performance.now();
    const duration = 400;

    const frame = () => {
      const elapsed = performance.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);

      ctx.clearRect(0, 0, w, h);
      let angle = startAngle;

      for (let i = 0; i < values.length; i++) {
        const sliceAngle = (values[i] / total) * Math.PI * 2 * eased;
        ctx.fillStyle = colors[i % colors.length];
        ctx.beginPath();
        ctx.arc(cx, cy, outerR, angle, angle + sliceAngle);
        ctx.arc(cx, cy, innerR, angle + sliceAngle, angle, true);
        ctx.fill();
        angle += sliceAngle;
      }

      if (progress < 1) {
        this.animFrame = requestAnimationFrame(frame);
      } else {
        this.animFrame = 0;
      }
    };
    this.animFrame = requestAnimationFrame(frame);
  }
}

interface ChartSeriesData {
  labels?: string[];
  values?: number[];
}
