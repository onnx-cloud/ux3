import type { Plugin } from '../../../../src/plugin/registry';

const version = '0.1.0';

const SIMPLE_PEER_CDN = 'https://unpkg.com/simple-peer@9.11.1/simplepeer.min.js';

export interface WebrtcConfig {
  cdn?: string;
  iceServers?: RTCIceServer[];
  defaultConstraints?: MediaStreamConstraints;
}

interface CallOptions {
  stream?: MediaStream;
  initiator?: boolean;
  signal?: any;
}

interface CallSession {
  peer: any;
  stream: MediaStream | null;
  onSignal?: (data: any) => void;
  onStream?: (stream: MediaStream) => void;
  destroy(): void;
}

function readConfig(app: any): WebrtcConfig {
  return (WebrtcPlugin as any).config ?? app.config?.plugins?.['@ux3/plugin-webrtc'] ?? {};
}

function getSimplePeer(): any {
  if (typeof window !== 'undefined' && (window as any).SimplePeer) {
    return (window as any).SimplePeer;
  }
  return null;
}

export const WebrtcPlugin: Plugin = {
  name: '@ux3/plugin-webrtc',
  version,
  description: 'WebRTC peer-to-peer video/audio calls for UX3 (SimplePeer)',

  install(app) {
    const cfg = readConfig(app);
    const cdnUrl = cfg.cdn ?? SIMPLE_PEER_CDN;

    app.registerAsset?.({ type: 'script', src: cdnUrl });

    app.registerService?.('webrtc', () => ({
      async getMedia(constraints?: MediaStreamConstraints): Promise<MediaStream> {
        return navigator.mediaDevices.getUserMedia(
          constraints ?? cfg.defaultConstraints ?? { video: true, audio: true }
        );
      },

      createCall(options: CallOptions): CallSession {
        const Peer = getSimplePeer();
        if (!Peer) throw new Error('SimplePeer not loaded');

        const peer = new Peer({
          initiator: options.initiator ?? false,
          stream: options.stream,
          config: { iceServers: cfg.iceServers ?? [{ urls: 'stun:stun.l.google.com:19302' }] },
        });

        const session: CallSession = {
          peer,
          stream: null,
          destroy() { peer.destroy(); },
        };

        peer.on('signal', (data: any) => session.onSignal?.(data));
        peer.on('stream', (stream: MediaStream) => {
          session.stream = stream;
          session.onStream?.(stream);
        });

        return session;
      },

      get SimplePeer() { return getSimplePeer(); },
    }));

    app.utils = app.utils ?? {};
    (app.utils as any).webrtc = { cdn: cdnUrl };
  },
};

export default WebrtcPlugin;
