/** Processamento local de fotografias: valida, corrige orientação, redimensiona, comprime e remove metadados (EXIF/GPS). */
export const PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
export const MAX_PHOTO_BYTES = 12 * 1024 * 1024;

export function validatePhotoFile(f: { type: string; size: number }): string | null {
  if (!PHOTO_TYPES.includes(f.type)) return 'Formato não suportado. Envie JPG, PNG ou WEBP.';
  if (f.size > MAX_PHOTO_BYTES) return 'Arquivo muito grande (máximo 12 MB).';
  if (f.size < 1024) return 'Arquivo inválido ou corrompido.';
  return null;
}

async function render(file: Blob, maxW: number, maxH: number, quality: number): Promise<Blob> {
  const bmp = await createImageBitmap(file, { imageOrientation: 'from-image' } as ImageBitmapOptions);
  const scale = Math.min(1, maxW / bmp.width, maxH / bmp.height);
  const w = Math.round(bmp.width * scale), h = Math.round(bmp.height * scale);
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Navegador sem suporte a processamento de imagem.');
  ctx.drawImage(bmp, 0, 0, w, h);
  bmp.close?.();
  // Recodificar via canvas descarta todos os metadados (EXIF, GPS, câmera).
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/webp', quality));
  if (blob && blob.type === 'image/webp') return blob;
  const jpg = await new Promise<Blob | null>((r) => canvas.toBlob(r, 'image/jpeg', quality));
  if (!jpg) throw new Error('Falha ao comprimir a imagem.');
  return jpg;
}

const toDataUrl = (b: Blob) => new Promise<string>((res, rej) => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.onerror = rej; r.readAsDataURL(b); });

export async function processPhoto(file: File) {
  const err = validatePhotoFile(file);
  if (err) throw new Error(err);
  // miniatura 4:5 até 480x600 (~20–45 KB) para cards; versão maior para o Storage
  let thumb = await render(file, 480, 600, 0.78);
  if (thumb.size > 90 * 1024) thumb = await render(file, 360, 450, 0.7);
  const full = await render(file, 1080, 1350, 0.82);
  return { thumbDataUrl: await toDataUrl(thumb), fullBlob: full };
}
