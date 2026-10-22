/**
 * Resized copy of a public storage image for grids and thumbnails, served by
 * Storage's image transforms. Anything that isn't a public storage URL (local
 * assets, data URLs) is returned unchanged.
 */
export function thumbUrl(url: string, width = 720, quality = 72): string {
  const marker = "/storage/v1/object/public/";
  if (!url.includes(marker)) return url;
  const [base] = url.split("?");
  return `${base.replace(marker, "/storage/v1/render/image/public/")}?width=${width}&quality=${quality}&resize=contain`;
}
