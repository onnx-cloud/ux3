function initImageLightbox(): void {
  if (typeof document === 'undefined') return;

  document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    if (target.closest('.ux-lightbox-overlay')) return;

    const panel = target.closest('ux-image-panel, ux-image') as HTMLElement | null;
    if (!panel) return;
    const img = panel.querySelector('img') as HTMLImageElement | null;
    if (!img?.src) return;

    const overlay = document.createElement('div');
    overlay.className = 'ux-lightbox-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:99999;background:rgba(0,0,0,0.88);display:flex;align-items:center;justify-content:center;cursor:pointer;';
    const image = document.createElement('img');
    image.src = img.src;
    image.style.cssText = 'max-width:90vw;max-height:90vh;object-fit:contain;border-radius:4px;box-shadow:0 4px 24px rgba(0,0,0,0.5);';
    overlay.appendChild(image);
    document.body.appendChild(overlay);
    document.body.style.overflow = 'hidden';

    const close = () => { overlay.remove(); document.body.style.overflow = ''; };
    overlay.addEventListener('click', (ev) => { if (ev.target === overlay) close(); });
    const onKey = (ev: KeyboardEvent) => { if (ev.key === 'Escape') { close(); document.removeEventListener('keydown', onKey); } };
    document.addEventListener('keydown', onKey);
  });
}

initImageLightbox();
