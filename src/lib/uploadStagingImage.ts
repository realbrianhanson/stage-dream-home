import { supabase } from "@/integrations/supabase/client";

/**
 * Convert a base64 data URL to a Blob
 */
function dataUrlToBlob(dataUrl: string): Blob {
  const [header, base64] = dataUrl.split(",");
  const mime = header.match(/:(.*?);/)?.[1] || "image/jpeg";
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: mime });
}

/**
 * Upload an image (base64 data URL or remote URL) to Supabase Storage
 * Returns the public URL.
 */
export async function uploadStagingImage(
  userId: string,
  stagingId: string,
  imageData: string,
  filename: string
): Promise<string> {
  let blob: Blob;

  if (imageData.startsWith("data:")) {
    blob = dataUrlToBlob(imageData);
  } else {
    // Remote URL (e.g. from AI gateway) — fetch it
    const res = await fetch(imageData);
    if (!res.ok) throw new Error(`Failed to fetch image for upload`);
    blob = await res.blob();
  }

  const ext = blob.type.includes("png") ? "png" : "jpg";
  const path = `${userId}/${stagingId}/${filename}.${ext}`;

  const { error } = await supabase.storage
    .from("stagings")
    .upload(path, blob, { contentType: blob.type, upsert: true });

  if (error) throw new Error(`Upload failed: ${error.message}`);

  const { data: urlData } = supabase.storage
    .from("stagings")
    .getPublicUrl(path);

  return urlData.publicUrl;
}
