// Pure output-size helpers for the image models. No Deno imports so vitest
// can cover them.

// GPT Image sizes: multiples of 16, long edge ≤ 3840, ≤ 8.3 MP. Above
// 2560×1440 is experimental, so stay at or under that for reliability.
export const HD_LONG_EDGE = 2560;
export const STANDARD_LONG_EDGE = 1536;
const MAX_PIXELS = 2560 * 1440;

const round16 = (n: number) => Math.max(16, Math.round(n / 16) * 16);

const parseRatio = (r: string): number => {
  const [w, h] = r.split(":").map(Number);
  return w > 0 && h > 0 ? w / h : 1;
};

/**
 * Pick a GPT Image `size` ("WxH") that matches the source photo's aspect
 * (or a forced ratio) as closely as the model allows.
 */
export function gptImageSize(srcW: number, srcH: number, forced?: string | null, maxLong = HD_LONG_EDGE): string {
  const aspect = forced ? parseRatio(forced) : srcW > 0 && srcH > 0 ? srcW / srcH : 1;
  let w = aspect >= 1 ? maxLong : maxLong * aspect;
  let h = aspect >= 1 ? maxLong / aspect : maxLong;
  if (w * h > MAX_PIXELS) {
    const k = Math.sqrt(MAX_PIXELS / (w * h));
    w *= k;
    h *= k;
  }
  // Rounding can tip us a hair over the pixel budget; step down once if so.
  let W = round16(w);
  let H = round16(h);
  if (W * H > MAX_PIXELS) {
    W = Math.floor(w / 16) * 16;
    H = Math.floor(h / 16) * 16;
  }
  return `${W}x${H}`;
}

/** Closest Gemini aspect_ratio string for a source photo. */
export function geminiAspect(srcW: number, srcH: number, forced?: string | null): string {
  if (forced) return forced;
  const options: Array<[string, number]> = [
    ["1:1", 1], ["4:3", 4 / 3], ["3:4", 3 / 4], ["3:2", 3 / 2], ["2:3", 2 / 3],
    ["16:9", 16 / 9], ["9:16", 9 / 16], ["5:4", 5 / 4], ["4:5", 4 / 5], ["21:9", 21 / 9],
  ];
  const a = srcW > 0 && srcH > 0 ? srcW / srcH : 1;
  return options.reduce((best, o) => (Math.abs(Math.log(o[1] / a)) < Math.abs(Math.log(best[1] / a)) ? o : best))[0];
}

/** Read width/height from JPEG, PNG or WebP bytes without decoding pixels. */
export function imageDimensions(b: Uint8Array): { width: number; height: number } | null {
  // PNG
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) {
    const dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
    return { width: dv.getUint32(16), height: dv.getUint32(20) };
  }
  // JPEG: walk segments to the first SOFn marker
  if (b[0] === 0xff && b[1] === 0xd8) {
    let i = 2;
    while (i + 9 < b.length) {
      if (b[i] !== 0xff) { i++; continue; }
      const marker = b[i + 1];
      const len = (b[i + 2] << 8) | b[i + 3];
      if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
        return { height: (b[i + 5] << 8) | b[i + 6], width: (b[i + 7] << 8) | b[i + 8] };
      }
      i += 2 + len;
    }
    return null;
  }
  // WebP (RIFF....WEBP)
  if (b[0] === 0x52 && b[1] === 0x49 && b[8] === 0x57 && b[9] === 0x45) {
    const chunk = String.fromCharCode(b[12], b[13], b[14], b[15]);
    if (chunk === "VP8X") {
      return { width: 1 + (b[24] | (b[25] << 8) | (b[26] << 16)), height: 1 + (b[27] | (b[28] << 8) | (b[29] << 16)) };
    }
    if (chunk === "VP8 ") {
      return { width: ((b[27] << 8) | b[26]) & 0x3fff, height: ((b[29] << 8) | b[28]) & 0x3fff };
    }
    if (chunk === "VP8L") {
      const bits = b[21] | (b[22] << 8) | (b[23] << 16) | (b[24] << 24);
      return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1 };
    }
  }
  return null;
}

/** Real image type from magic bytes; storage and gateways don't always label it. */
export function sniffMime(b: Uint8Array): "image/jpeg" | "image/png" | "image/webp" | null {
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return "image/png";
  if (b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 && b[8] === 0x57 && b[9] === 0x45) return "image/webp";
  return null;
}
