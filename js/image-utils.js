// Resizes/compresses an image file down to a JPEG data URI that fits
// comfortably under Firestore's 1 MiB per-document limit, since cook-log
// photos are stored directly in Firestore (Cloud Storage now requires
// the paid Blaze plan).
export async function compressImageToDataUrl(file, options = {}) {
  const maxBytes = options.maxBytes || 700 * 1024;
  let dim = options.startDim || 1400;
  let quality = options.startQuality || 0.8;

  const img = await loadImage(file);

  for (let attempt = 0; attempt < 6; attempt++) {
    const dataUrl = drawToDataUrl(img, dim, quality);
    const approxBytes = Math.ceil((dataUrl.length * 3) / 4);
    if (approxBytes <= maxBytes) return dataUrl;
    quality = Math.max(0.3, quality - 0.15);
    dim = Math.round(dim * 0.8);
  }
  return null;
}

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function drawToDataUrl(img, maxDim, quality) {
  let { width, height } = img;
  if (width >= height && width > maxDim) {
    height = Math.round((height * maxDim) / width);
    width = maxDim;
  } else if (height > width && height > maxDim) {
    width = Math.round((width * maxDim) / height);
    height = maxDim;
  }
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  canvas.getContext("2d").drawImage(img, 0, 0, width, height);
  return canvas.toDataURL("image/jpeg", quality);
}
