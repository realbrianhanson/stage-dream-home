const MAX_EDGE = 2048;
const MAX_BYTES = 15 * 1024 * 1024;

/**
 * Read a photo the user picked and return a JPEG data URL no larger than
 * 2048px on the long edge, so uploads are quick and every model gets the
 * same kind of input.
 */
export function prepareImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) return reject(new Error("Please choose a photo (JPG, PNG or WebP)."));
    if (file.size > MAX_BYTES) return reject(new Error("That photo is over 15 MB. Please use a smaller one."));
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, MAX_EDGE / Math.max(img.naturalWidth, img.naturalHeight));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.naturalWidth * scale);
      canvas.height = Math.round(img.naturalHeight * scale);
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        URL.revokeObjectURL(url);
        return reject(new Error("Your browser couldn't read that photo."));
      }
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", 0.9));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("That file couldn't be opened. Try a JPG or PNG."));
    };
    img.src = url;
  });
}
