// Next calls this before push/replace/back/forward navigation. No analytics or
// network requests: this only informs the local loading indicator.
export function onRouterTransitionStart(url: string) {
  try {
    const target = new URL(url, window.location.href);
    if (target.origin !== window.location.origin) return;
    document.documentElement.dataset.hvvPendingNavigation = target.href;
    window.dispatchEvent(new CustomEvent('huevivu:navigation-start', { detail: target.href }));
  } catch { /* Loading feedback must never block navigation. */ }
}
