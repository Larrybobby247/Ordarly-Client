// PERF (new): ask Cloudinary for a right-sized, modern-format copy (WebP/AVIF automatically via f_auto) instead of the full upload.
// Only Cloudinary URLs are changed; any other image link is returned untouched, so nothing breaks for pasted image links.
// `w` is the CSS width you display it at; we request 2x for sharp phone screens, capped at `max`.
export function optimizeImage(url, w = 400, max = 1600) {
  if (!url || typeof url !== 'string') return url;
  if (!/res\.cloudinary\.com\/[^/]+\/image\/upload\//.test(url) || /\/image\/upload\/[^/]*(f_auto|w_\d)/.test(url)) return url;
  const width = Math.min(max, Math.round(w * 2));
  return url.replace('/image/upload/', `/image/upload/f_auto,q_auto,c_limit,w_${width}/`);
}
