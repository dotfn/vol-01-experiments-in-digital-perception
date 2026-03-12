/**
 * Adds the `vis` CSS class to each matched element when it enters
 * the viewport, handling both initial load and Astro's client-side
 * navigation (`astro:page-load`).
 *
 * Usage:
 *   observeVisibility('#experiments, .exp-col', { threshold: 0.08 });
 */
export function observeVisibility(
  selector: string,
  options: IntersectionObserverInit = { threshold: 0.08 },
): void {
  const attach = () => {
    document.querySelectorAll<HTMLElement>(selector).forEach(el => {
      new IntersectionObserver(([entry], obs) => {
        if (entry.isIntersecting) {
          el.classList.add('vis');
          obs.disconnect(); // once visible, no need to keep observing
        }
      }, options).observe(el);
    });
  };

  attach();
  document.addEventListener('astro:page-load', attach);
}