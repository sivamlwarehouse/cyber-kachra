const MAX_DIMENSION = 640;
const TARGET_BYTES = 200 * 1024;
const MAX_BYTES = 400 * 1024;
const QUALITY_STEPS = [0.65, 0.55, 0.45, 0.35];

function estimateDataUrlBytes(dataUrl: string): number {
  const base64 = dataUrl.split(',')[1] ?? dataUrl;
  return Math.ceil((base64.length * 3) / 4);
}

function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Could not read this photo. Please try another image.'));
      img.src = event.target?.result as string;
    };
    reader.onerror = () => reject(new Error('Could not read this photo. Please try again.'));
    reader.readAsDataURL(file);
  });
}

function resizeToCanvas(img: HTMLImageElement): HTMLCanvasElement {
  let width = img.width;
  let height = img.height;

  if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
    if (width > height) {
      height = Math.round((height * MAX_DIMENSION) / width);
      width = MAX_DIMENSION;
    } else {
      width = Math.round((width * MAX_DIMENSION) / height);
      height = MAX_DIMENSION;
    }
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not process photo on this device.');
  ctx.drawImage(img, 0, 0, width, height);
  return canvas;
}

export interface CompressImageResult {
  dataUrl: string;
  sizeKb: number;
}

export async function compressImageFile(file: File): Promise<CompressImageResult> {
  const img = await loadImageFromFile(file);
  const canvas = resizeToCanvas(img);

  let dataUrl = '';
  for (const quality of QUALITY_STEPS) {
    dataUrl = canvas.toDataURL('image/jpeg', quality);
    if (estimateDataUrlBytes(dataUrl) <= TARGET_BYTES) break;
  }

  const sizeBytes = estimateDataUrlBytes(dataUrl);
  if (sizeBytes > MAX_BYTES) {
    throw new Error(
      'Photo is still too large after compression. Move closer or choose a smaller image.',
    );
  }

  return {
    dataUrl,
    sizeKb: Math.round(sizeBytes / 1024),
  };
}

export function formatPhotoSize(sizeKb: number): string {
  return `Photo ready (~${sizeKb}KB)`;
}
