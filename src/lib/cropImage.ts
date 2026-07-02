const createImage = (url: string): Promise<HTMLImageElement> =>
  new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    image.src = url;
  });

export default async function getCroppedImg(
  imageSrc: string,
  pixelCrop: { x: number; y: number; width: number; height: number }
) {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) return null;

  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  );

  const MAX = 600;
  if (pixelCrop.width > MAX || pixelCrop.height > MAX) {
    const scaledCanvas = document.createElement('canvas');
    const maxRatio = Math.max(pixelCrop.width / MAX, pixelCrop.height / MAX);
    scaledCanvas.width = pixelCrop.width / maxRatio;
    scaledCanvas.height = pixelCrop.height / maxRatio;
    const sCtx = scaledCanvas.getContext('2d');
    sCtx?.drawImage(canvas, 0, 0, scaledCanvas.width, scaledCanvas.height);
    return scaledCanvas.toDataURL('image/jpeg', 0.85);
  }

  return canvas.toDataURL('image/jpeg', 0.85);
}
