import { UxBase } from './base.js';

export class UxCapture extends UxBase {
  private mediaStream: MediaStream | null = null;
  private videoEl: HTMLVideoElement | null = null;
  private canvasEl: HTMLCanvasElement | null = null;
  private started = false;

  protected onConnected(): void {
    super.onConnected();
    this.setAttribute('tabindex', '0');
    this.addEventListener('click', this.startCapture);
    this.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); this.startCapture(); }
    });
  }

  private async startCapture() {
    if (this.started) return;
    this.started = true;
    const captureType = this.getAttribute('type') || 'image';

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      this.started = false;
      this.innerHTML = `<div style="text-align:center;padding:1rem;">
        <div style="color:var(--color-text-muted,#6b7280);font-size:0.875rem;margin-bottom:0.5rem;">Camera not available in this browser</div>
        <button class="ux-capture-retry" style="padding:0.375rem 0.75rem;border:1px solid var(--color-border,#d1d5db);border-radius:0.25rem;background:var(--color-bg,#fff);cursor:pointer;font:inherit;font-size:0.75rem;">Retry</button>
      </div>`;
      this.querySelector('.ux-capture-retry')?.addEventListener('click', () => { this.started = false; this.startCapture(); });
      return;
    }
    try {
      let constraints: MediaStreamConstraints = {};
      if (captureType === 'image') {
        constraints = { video: { facingMode: { ideal: 'user' }, width: { ideal: 640 }, height: { ideal: 480 } } };
      } else if (captureType === 'video') {
        constraints = { video: { facingMode: { ideal: 'user' } }, audio: true };
      } else if (captureType === 'audio') {
        constraints = { audio: true };
      }

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch {
        const relaxed: MediaStreamConstraints =
          captureType === 'audio' ? { audio: true } : { video: true };
        stream = await navigator.mediaDevices.getUserMedia(relaxed);
      }
      this.mediaStream = stream;

      if (captureType === 'image') {
        this.innerHTML = '';
        this.videoEl = document.createElement('video');
        this.videoEl.srcObject = stream;
        this.videoEl.autoplay = true;
        this.videoEl.muted = true;
        this.videoEl.playsInline = true;
        this.videoEl.style.cssText = 'width:100%;max-width:320px;border-radius:0.5rem 0.5rem 0 0;';
        this.appendChild(this.videoEl);

        const captureBtn = document.createElement('button');
        captureBtn.textContent = '\u25CF Capture';
        captureBtn.style.cssText = 'display:block;width:100%;max-width:320px;padding:0.5rem;border:none;border-radius:0 0 0.5rem 0.5rem;background:var(--color-primary,#3b82f6);color:#fff;cursor:pointer;font:inherit;font-size:0.875rem;';
        captureBtn.addEventListener('click', (e) => { e.stopPropagation(); this.captureFrame(); });
        this.appendChild(captureBtn);

        this.canvasEl = document.createElement('canvas');
        this.canvasEl.style.display = 'none';
        this.appendChild(this.canvasEl);

        this.removeEventListener('click', this.startCapture);
      } else if (captureType === 'video') {
        this.videoEl = document.createElement('video');
        this.videoEl.srcObject = stream;
        this.videoEl.autoplay = true;
        this.videoEl.muted = true;
        this.videoEl.playsInline = true;
        this.videoEl.style.cssText = 'width:100%;max-width:320px;border-radius:0.5rem;margin-top:0.5rem;';
        this.innerHTML = '';
        this.appendChild(this.videoEl);

        const stopBtn = document.createElement('button');
        stopBtn.textContent = '\u25A0 Stop';
        stopBtn.style.cssText = 'display:block;width:100%;max-width:320px;margin-top:0.375rem;padding:0.5rem;border:1px solid var(--color-border,#d1d5db);border-radius:0.375rem;background:var(--color-bg,#fff);cursor:pointer;font:inherit;font-size:0.875rem;';
        stopBtn.addEventListener('click', (e) => { e.stopPropagation(); this.stopCapture(); });
        this.appendChild(stopBtn);
      } else if (captureType === 'audio') {
        this.innerHTML = '<span style="font-size:0.875rem;">\u25CF Recording...</span>';
        const stopBtn = document.createElement('button');
        stopBtn.textContent = '\u25A0 Stop';
        stopBtn.style.cssText = 'margin-left:0.5rem;padding:0.25rem 0.75rem;border:1px solid var(--color-border,#d1d5db);border-radius:0.25rem;background:var(--color-bg-muted,#f3f4f6);cursor:pointer;font:inherit;font-size:0.875rem;';
        stopBtn.addEventListener('click', (e) => { e.stopPropagation(); this.stopCapture(); });
        this.appendChild(stopBtn);
      }

      this.dispatchEvent(new CustomEvent('ux:media.capture.start', {
        bubbles: true, composed: true,
        detail: { stream, kind: captureType },
      }));
    } catch (e) {
      this.started = false;
      const msg = e instanceof DOMException
        ? (e.name === 'NotAllowedError' ? 'Permission denied' : e.name === 'NotFoundError' ? 'No device found' : e.message)
        : String(e);
      this.innerHTML = `<div style="text-align:center;padding:1rem;">
        <div style="color:var(--color-text-muted,#6b7280);font-size:0.875rem;margin-bottom:0.5rem;">${msg}</div>
        <button class="ux-capture-retry" style="padding:0.375rem 0.75rem;border:1px solid var(--color-border,#d1d5db);border-radius:0.25rem;background:var(--color-bg,#fff);cursor:pointer;font:inherit;font-size:0.75rem;">Retry</button>
      </div>`;
      this.querySelector('.ux-capture-retry')?.addEventListener('click', () => { this.started = false; this.startCapture(); });
    }
  }

  private captureFrame() {
    if (!this.videoEl || !this.canvasEl) return;
    this.canvasEl.width = this.videoEl.videoWidth || 320;
    this.canvasEl.height = this.videoEl.videoHeight || 240;
    const ctx = this.canvasEl.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(this.videoEl, 0, 0);
    const dataUrl = this.canvasEl.toDataURL('image/png');
    this.stopMedia();
    this.innerHTML = '';
    const img = document.createElement('img');
    img.src = dataUrl;
    img.style.cssText = 'width:100%;max-width:320px;border-radius:0.5rem;';
    this.appendChild(img);
    this.dispatchEvent(new CustomEvent('ux:capture', {
      bubbles: true, composed: true,
      detail: { dataUrl, kind: 'image' },
    }));
  }

  private stopCapture() {
    this.stopMedia();
    this.innerHTML = '';
    this.started = false;
    this.addEventListener('click', this.startCapture);
    this.dispatchEvent(new CustomEvent('ux:media.capture.stop', {
      bubbles: true, composed: true, detail: {},
    }));
  }

  private stopMedia() {
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((t) => t.stop());
      this.mediaStream = null;
    }
  }

  protected onDisconnected(): void {
    this.removeEventListener('click', this.startCapture);
    this.stopMedia();
    super.onDisconnected();
  }
}
