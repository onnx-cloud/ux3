import type { Plugin } from '../../../../src/plugin/registry';
import { LifecycleComponent } from '../../../../src/ui/lifecycle-component.js';

const version = '0.1.0';

// Leaflet CDN assets – both JS and CSS are required for Leaflet to render correctly
const LEAFLET_JS_CDN = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
const LEAFLET_CSS_CDN = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';

const DEFAULT_TILE_PROVIDER = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
const DEFAULT_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
const DEFAULT_MAX_ZOOM = 19;

export interface OpenMapsConfig {
  /** Load and cache Leaflet from CDN (default: true) */
  bundled?: boolean;
  /** Custom CDN URL for Leaflet JS */
  cdn?: string;
  /** Tile layer URL template */
  tileProvider?: string;
  /** Attribution string shown in the map corner */
  tileAttribution?: string;
  /** Maximum tile zoom level */
  tileMaxZoom?: number;
}

export interface MapCreateOptions {
  center?: [number, number];
  zoom?: number;
  /** Any extra Leaflet map options */
  [key: string]: unknown;
}

function readConfig(app: any): OpenMapsConfig {
  return (
    (OpenMapsPlugin as any).config ??
    app.config?.plugins?.['@ux3/ux-openmaps'] ??
    {}
  );
}

function getLeaflet(): any {
  if (typeof window !== 'undefined' && (window as any).L) {
    return (window as any).L;
  }
  return null;
}

export const OpenMapsPlugin: Plugin = {
  name: '@ux3/ux-openmaps',
  version,
  description: 'OpenStreetMap / Leaflet map integration for UX3',

  install(app) {
    const cfg = readConfig(app);
    const jsCdn = cfg.cdn ?? LEAFLET_JS_CDN;
    const tileProvider = cfg.tileProvider ?? DEFAULT_TILE_PROVIDER;
    const tileAttribution = cfg.tileAttribution ?? DEFAULT_ATTRIBUTION;
    const tileMaxZoom = cfg.tileMaxZoom ?? DEFAULT_MAX_ZOOM;

    // Inject Leaflet CSS and JS into the page.  The CSS must be loaded for
    // tiles and controls to render correctly.
    app.registerAsset?.({ type: 'style', href: LEAFLET_CSS_CDN });
    app.registerAsset?.({ type: 'script', src: jsCdn });

    app.registerService?.('map', () => ({
      /**
       * Create a Leaflet map in the given container element.
       *
       * @example
       * const map = await app.services.map.create(el, { center: [48.85, 2.35], zoom: 12 });
       */
      create(el: HTMLElement, opts: MapCreateOptions = {}) {
        const L = getLeaflet();
        if (!L) {
          throw new Error(
            '@ux3/ux-openmaps: Leaflet is not loaded. ' +
            'Make sure bundled:true is set in the plugin config or include Leaflet manually.'
          );
        }
        const { center = [51.505, -0.09], zoom = 13, ...rest } = opts;
        const map = L.map(el, rest).setView(center, zoom);
        L.tileLayer(tileProvider, {
          attribution: tileAttribution,
          maxZoom: tileMaxZoom,
        }).addTo(map);
        return map;
      },

      /** Return the raw Leaflet global (L) if available. */
      get L() {
        return getLeaflet();
      },
    }));

    app.utils = app.utils ?? {};
    (app.utils as any).openmaps = {
      tileProvider,
      tileAttribution,
      tileMaxZoom,
      jsCdn,
      cssCdn: LEAFLET_CSS_CDN,
    };

    if (typeof customElements !== 'undefined' && !customElements.get('ux-map')) {
      customElements.define('ux-map', class extends LifecycleComponent {
        protected onConnected() {
          this.style.display = 'block';
          this.style.minHeight = '300px';
          const el = this;
          const poll = () => {
            const L = getLeaflet();
            const svc = (window as any).__ux3App?.services?.map;
            if (!L || !svc?.create) { setTimeout(poll, 200); return; }
            const lat = this.getAttribute('lat');
            const lng = this.getAttribute('lng');
            const zoom = this.getAttribute('zoom');
            const center: [number, number] = lat && lng ? [parseFloat(lat), parseFloat(lng)] : [51.505, -0.09];
            svc.create(el, { center, zoom: zoom ? parseInt(zoom) : 13 });
          };
          setTimeout(poll, 100);
        }
      });
    }
  },
};

export default OpenMapsPlugin;
