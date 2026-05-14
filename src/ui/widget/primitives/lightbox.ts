let _lightboxInited = false;

function initImageLightbox(): void {
  if (typeof document === 'undefined' || _lightboxInited) return;
  _lightboxInited = true;

  document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    if (target.closest('.ux-lightbox-overlay') || target.closest('.ux-link-modal')) return;

    const panel = target.closest('ux-image-panel, ux-image') as HTMLElement | null;
    if (!panel) return;
    const img = panel.querySelector('img') as HTMLImageElement | null;
    if (!img?.src) return;

    const overlay = document.createElement('div');
    overlay.className = 'ux-lightbox-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;cursor:default;';

    const container = document.createElement('div');
    container.style.cssText = 'background:var(--color-bg,#fff);border-radius:0.75rem;width:min(92vw,90vw);max-height:90vh;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,0.3);';

    const header = document.createElement('div');
    header.style.cssText = 'display:flex;justify-content:space-between;align-items:center;padding:0.75rem 1.5rem;border-bottom:1px solid var(--color-border,#e2e8f0);flex-shrink:0;';
    const title = document.createElement('span');
    title.style.cssText = 'font-size:0.875rem;color:var(--color-text-muted,#6b7280);';
    title.textContent = img.alt || 'Image';
    const closeBtn = document.createElement('button');
    closeBtn.style.cssText = 'background:none;border:none;font-size:1.25rem;cursor:pointer;color:var(--color-text-muted,#6b7280);padding:0 0.25rem;width:2rem;height:2rem;border-radius:0.25rem;display:flex;align-items:center;justify-content:center;';
    closeBtn.setAttribute('aria-label', 'Close');
    closeBtn.textContent = '\u2715';
    closeBtn.onmouseenter = () => { closeBtn.style.background = 'var(--color-bg-muted,#f3f4f6)'; closeBtn.style.color = 'var(--color-text,#0f172a)'; };
    closeBtn.onmouseleave = () => { closeBtn.style.background = ''; closeBtn.style.color = ''; };
    header.appendChild(title);
    header.appendChild(closeBtn);
    container.appendChild(header);

    const body = document.createElement('div');
    body.style.cssText = 'flex:1;overflow:auto;display:flex;align-items:center;justify-content:center;padding:1.5rem;';
    const image = document.createElement('img');
    image.src = img.src;
    image.style.cssText = 'max-width:100%;max-height:70vh;object-fit:contain;border-radius:0.5rem;';
    body.appendChild(image);
    container.appendChild(body);

    overlay.appendChild(container);
    document.body.appendChild(overlay);
    document.body.style.overflow = 'hidden';

    const close = () => {
      overlay.remove();
      document.body.style.overflow = '';
      document.removeEventListener('keydown', onKey);
    };
    closeBtn.addEventListener('click', close);
    overlay.addEventListener('click', (ev) => { if (ev.target === overlay) close(); });
    const onKey = (ev: KeyboardEvent) => { if (ev.key === 'Escape') close(); };
    document.addEventListener('keydown', onKey);
  });
}

initImageLightbox();
