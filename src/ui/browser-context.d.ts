export type Reliability = 'high' | 'medium' | 'low';
export interface BrowserContext {
    capturedAt: string;
    locale: {
        primary: string;
        language: string;
        region?: string;
        preferred: string[];
        direction: 'ltr' | 'rtl';
        reliability: Reliability;
    };
    datetime: {
        timeZone?: string;
        offsetMinutes: number;
        localeCalendar?: string;
        localeNumberingSystem?: string;
        hourCycle?: 'h11' | 'h12' | 'h23' | 'h24';
        reliability: Reliability;
    };
    userAgent: {
        platform?: string;
        mobile?: boolean;
        brands?: Array<{
            brand: string;
            version: string;
        }>;
        architecture?: string;
        bitness?: string;
        model?: string;
        fullUA?: string;
        reliability: Reliability;
    };
    display: {
        viewport: {
            width: number;
            height: number;
        };
        screen: {
            width: number;
            height: number;
            availWidth?: number;
            availHeight?: number;
        };
        devicePixelRatio: number;
        size?: 'sm' | 'md' | 'lg' | 'xl';
        orientation?: 'portrait' | 'landscape';
        colorScheme: 'light' | 'dark' | 'no-preference';
        contrast: 'more' | 'less' | 'no-preference' | 'custom';
        reducedMotion: boolean;
        reducedTransparency?: boolean;
        forcedColors?: boolean;
        reliability: Reliability;
    };
    input: {
        pointer: 'none' | 'coarse' | 'fine' | 'mixed';
        hover: boolean;
        touchPoints: number;
        keyboardLikely: boolean;
        reliability: Reliability;
    };
    connectivity: {
        online: boolean;
        effectiveType?: 'slow-2g' | '2g' | '3g' | '4g';
        downlinkMbps?: number;
        rttMs?: number;
        saveData?: boolean;
        reliability: Reliability;
    };
    capabilities: {
        cookiesEnabled?: boolean;
        localStorage?: boolean;
        sessionStorage?: boolean;
        serviceWorker?: boolean;
        webGL?: boolean;
        wasm?: boolean;
        notificationsPermission?: 'granted' | 'denied' | 'prompt' | 'unknown';
        reliability: Reliability;
    };
    sources: Record<string, string>;
}
export interface BrowserContextOptions {
    enableHighEntropyUA?: boolean;
    observeChanges?: boolean;
    now?: () => Date;
    debounceMs?: number;
}
export declare function captureBrowserContext(options?: BrowserContextOptions): BrowserContext;
export declare function observeBrowserContext(onChange: (context: BrowserContext) => void, options?: BrowserContextOptions): () => void;
