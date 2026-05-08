import { UxBase } from './base.js';

export class UxCapture extends UxBase {
  private mediaStream: MediaStream | null = null;

  protected onConnected(): void {
    super.onConnected();
    this.setAttribute('tabindex', '0');
    this.addEventListener('click', this.startCapture);
    this.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); this.startCapture(); }
    });
  }

  private async startCapture() {
    const tag = this.localName;
    try {
      let constraints: MediaStreamConstraints = {};
      if (tag === 'ux-image-capture') {
        constraints = { video: { facingMode: 'user' } };
      } else if (tag === 'ux-video-capture') {
        constraints = { video: true, audio: true };
      } else if (tag === 'ux-audio-capture') {
        constraints = { audio: true };
      }

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      this.mediaStream = stream;
      this.dispatchEvent(new CustomEvent('ux:capture', {
        bubbles: true,
        detail: { stream, kind: tag.replace('ux-', '').replace('-capture', '') },
      }));
    } catch (e) {
      this.dispatchEvent(new CustomEvent('ux:capture-error', {
        bubbles: true,
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
