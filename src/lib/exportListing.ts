import type { StagingRow } from "@/lib/stagingApi";

const slug = (s: string) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40) || "photo";

const extFor = (type: string) => (type.includes("png") ? "png" : type.includes("webp") ? "webp" : "jpg");

const DISCLOSURE = `Some photos in this folder were edited with AI (virtual staging or virtual
enhancement). Files ending in "-edited" are edited; files ending in "-original" are the
unedited photos. Most MLS boards require you to label edited photos as virtually
staged and to show the original alongside them. Check your board's rules before
uploading.
`;

/** Name pairs so they sort together: 01-living-room-original / 01-living-room-modern-edited. */
export function exportNames(rows: StagingRow[]): Array<{ row: StagingRow; prefix: string }> {
  const sorted = [...rows].sort((a, b) => a.created_at.localeCompare(b.created_at));
  return sorted.map((row, i) => ({
    row,
    prefix: `${String(i + 1).padStart(2, "0")}-${slug(row.room_type)}`,
  }));
}

/**
 * Zip every photo of a listing as original + edited pairs with a disclosure
 * note, ready to upload to the MLS. Originals shared by several edits are
 * included once.
 */
export async function exportListingZip(property: string, rows: StagingRow[], onProgress?: (done: number, total: number) => void) {
  const { default: JSZip } = await import("jszip");
  const zip = new JSZip();
  const seenOriginals = new Map<string, string>();
  const named = exportNames(rows);
  let done = 0;
  const failed: string[] = [];

  for (const { row, prefix } of named) {
    try {
      if (!seenOriginals.has(row.original_image_url)) {
        const res = await fetch(row.original_image_url);
        if (res.ok) {
          const blob = await res.blob();
          const name = `${prefix}-original.${extFor(blob.type)}`;
          zip.file(name, blob);
          seenOriginals.set(row.original_image_url, name);
        }
      }
      const res = await fetch(row.staged_image_url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const blob = await res.blob();
      zip.file(`${prefix}-${slug(row.style)}-edited.${extFor(blob.type)}`, blob);
    } catch (err) {
      console.error("export item failed:", err);
      failed.push(`${prefix} ${row.style}`);
    }
    onProgress?.(++done, named.length);
  }

  zip.file("README.txt", `${property}\n\n${DISCLOSURE}`);
  const blob = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${slug(property)}-listing-photos.zip`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  return { failed };
}
