# @ux3/plugin-webrtc

WebRTC video/audio calling for UX3 via SimplePeer

## Features

- Browser-based audio/video calling
- Peer-to-peer connection utilities
- Signaling and ICE/STUN support
- Data channel and media stream helpers

## Installation

```bash
npm install @ux3/plugin-webrtc
```

## Basic Usage

```ts
import PluginWebrtc from '@ux3/plugin-webrtc';

const app = initializeApp({
  plugins: [PluginWebrtc],
});
```

## Plugin Usage

- Register the plugin in your app with the UX3 plugin registry.
- Configure it through `plugins` config if required.
- Access runtime helpers through `app.utils`, `app.services`, or the plugin export.

## Configuration

```yaml
plugins:
  - name: '@ux3/plugin-webrtc'
    config:
      # Plugin-specific options
      
```

## API

Plugin-specific helpers are exposed through `app.utils`, `app.services`, or direct plugin exports.

## Example

```ts
import PluginWebrtc from '@ux3/plugin-webrtc';

const app = initializeApp({
  plugins: [PluginWebrtc],
});
```

## Notes

- Configure sensitive values through environment variables or secure runtime config.
- Keep plugin registration explicit in your UX3 app configuration.
