/** Klientská komprese obrázku na max. `maxBytes` (JPEG). */

const DEFAULT_MAX_BYTES = 2 * 1024 * 1024;
/** Odmítnout absurdně velké zdroje před dekódováním. */
export const PHOTO_SOURCE_MAX_BYTES = 40 * 1024 * 1024;
const MAX_EDGE = 2560;

function loadImageBitmap(file: File): Promise<ImageBitmap> {
  return createImageBitmap(file);
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number,
): Promise<Blob | null> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), type, quality);
  });
}

function drawScaled(
  source: ImageBitmap | HTMLImageElement,
  maxEdge: number,
): HTMLCanvasElement {
  const w = "width" in source ? source.width : 0;
  const h = "height" in source ? source.height : 0;
  const scale = Math.min(1, maxEdge / Math.max(w, h, 1));
  const width = Math.max(1, Math.round(w * scale));
  const height = Math.max(1, Math.round(h * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas 2D není dostupný.");
  ctx.drawImage(source, 0, 0, width, height);
  return canvas;
}

function jpegName(name: string): string {
  const base = name.replace(/\.[^.]+$/, "") || "fotka";
  return `${base}.jpg`;
}

/**
 * Zmenší obrázek na ≤ `maxBytes`. Už pod limitem → vrátí originál.
 * HEIC/HEIF bez podpory v prohlížeči → chyba, pokud je nad limitem.
 */
export async function compressImageToMaxBytes(
  file: File,
  maxBytes: number = DEFAULT_MAX_BYTES,
): Promise<File> {
  if (file.size <= maxBytes) return file;

  let bitmap: ImageBitmap;
  try {
    bitmap = await loadImageBitmap(file);
  } catch {
    throw new Error(
      `Fotku „${file.name}“ se nepodařilo zpracovat. Zkuste JPEG nebo PNG.`,
    );
  }

  try {
    let edge = Math.min(MAX_EDGE, Math.max(bitmap.width, bitmap.height));
    let quality = 0.85;

    for (let attempt = 0; attempt < 12; attempt++) {
      const canvas = drawScaled(bitmap, edge);
      const blob = await canvasToBlob(canvas, "image/jpeg", quality);
      if (blob && blob.size <= maxBytes) {
        return new File([blob], jpegName(file.name), {
          type: "image/jpeg",
          lastModified: Date.now(),
        });
      }
      if (quality > 0.45) {
        quality -= 0.1;
      } else {
        edge = Math.round(edge * 0.75);
        quality = 0.75;
      }
      if (edge < 480) break;
    }

    throw new Error(
      `Fotku „${file.name}“ se nepodařilo zmenšit pod ${Math.round(maxBytes / (1024 * 1024))} MB.`,
    );
  } finally {
    bitmap.close();
  }
}
