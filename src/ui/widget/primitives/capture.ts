import { UxBase } from './base.js';

export class UxCapture extends UxBase {
  private mediaStream: MediaStream | null = null;
  private videoEl: HTMLVideoElement | null = null;
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
    const tag = this.localName;
    try {
      let constraints: MediaStreamConstraints = {};
      if (tag === 'ux-image-capture') {
        constraints = { video: { facingMode: { ideal: 'user' } } };
      } else if (tag === 'ux-video-capture') {
        constraints = { video: { facingMode: { ideal: 'user' } }, audio: true };
      } else if (tag === 'ux-audio-capture') {
        constraints = { audio: true };
      }

      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
      } catch {
        const relaxed: MediaStreamConstraints =
          tag === 'ux-audio-capture' ? { audio: true } : { video: true };
        stream = await navigator.mediaDevices.getUserMedia(relaxed);
      }
      this.mediaStream = stream;

      if (tag === 'ux-image-capture' || tag === 'ux-video-capture') {
        this.videoEl = document.createElement('video');
        this.videoEl.srcObject = stream;
        this.videoEl.autoplay = true;
        this.videoEl.muted = true;
        this.videoEl.playsInline = true;
        this.videoEl.style.cssText = 'width:100%;max-width:320px;border-radius:0.5rem;margin-top:0.5rem;';
        this.innerHTML = '';
        this.appendChild(this.videoEl);
      }

      this.dispatchEvent(new CustomEvent('ux:capture', {
        bubbles: true, composed: true,
        detail: { stream, kind: tag.replace('ux-', '').replace('-capture', '') },
      }));
    } catch (e) {
      this.started = false;
      this.innerHTML = `<span style="color:var(--color-danger,#ef4444);font-size:0.875rem;">${e instanceof Error ? e.message : String(e)}</span>`;
      this.dispatchEvent(new CustomEvent('ux:capture-error', {
        bubbles: true, composed: true,
        detail: { error: e instanceof Error ? e.message : String(e) },
      }));
    }
  }

  protected onDisconnected(): void {
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((t) => t.stop());
      this.mediaStream = null;
    }
    super.onDisconnected();
  }
}
