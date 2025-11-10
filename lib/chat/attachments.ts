export const MAX_ATTACHMENTS = 4;
export const MAX_FILE_SIZE_MB = 5;
export const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
export const COMPRESS_THRESHOLD_BYTES = 900 * 1024;
export const MAX_BASE64_ATTACHMENT_BYTES = 1.5 * 1024 * 1024;
export const MAX_ATTACHMENT_EDGE = 1600;
export const MIN_ATTACHMENT_EDGE = 512;
export const DEFAULT_JPEG_QUALITY = 0.85;
export const MIN_JPEG_QUALITY = 0.55;
export const DOWNSCALE_STEP = 0.85;

export type OptimizedImageAttachment = {
  dataUrl: string;
  size: number;
  type: string;
  name: string;
};

export async function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string) ?? "");
    reader.onerror = () =>
      reject(reader.error ?? new Error("Unable to read attachment."));
    reader.readAsDataURL(file);
  });
}

export function estimateBase64Size(dataUrl: string): number {
  const [, base64 = ""] = dataUrl.split(",");
  if (!base64) return 0;
  const padding = base64.endsWith("==") ? 2 : base64.endsWith("=") ? 1 : 0;
  return Math.max(0, Math.floor((base64.length * 3) / 4) - padding);
}

export async function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = document.createElement("img");
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Unable to decode the selected image."));
    };
    image.src = url;
  });
}

export async function compressImageFile(
  file: File,
): Promise<OptimizedImageAttachment> {
  const image = await loadImageFromFile(file);
  const canvas = document.createElement("canvas");
  const context = canvas.getContext("2d");

  if (!context) {
    throw new Error("Image compression is not supported in this browser.");
  }

  const originalWidth = image.naturalWidth || image.width;
  const originalHeight = image.naturalHeight || image.height;

  if (!originalWidth || !originalHeight) {
    throw new Error("We couldn't read the image dimensions.");
  }

  let currentScale = Math.min(
    1,
    MAX_ATTACHMENT_EDGE / Math.max(originalWidth, originalHeight),
  );
  if (!Number.isFinite(currentScale) || currentScale <= 0) {
    currentScale = 1;
  }

  const minScale = Math.min(
    1,
    MIN_ATTACHMENT_EDGE / Math.max(originalWidth, originalHeight),
  );

  const render = (width: number, height: number, quality: number) => {
    canvas.width = width;
    canvas.height = height;
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.clearRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);
    return canvas.toDataURL("image/jpeg", quality);
  };

  let quality = DEFAULT_JPEG_QUALITY;
  let width = Math.max(Math.round(originalWidth * currentScale), 1);
  let height = Math.max(Math.round(originalHeight * currentScale), 1);

  let dataUrl = render(width, height, quality);
  let size = estimateBase64Size(dataUrl);

  while (
    size > MAX_BASE64_ATTACHMENT_BYTES &&
    (quality > MIN_JPEG_QUALITY || currentScale > minScale)
  ) {
    if (quality > MIN_JPEG_QUALITY) {
      quality = Math.max(MIN_JPEG_QUALITY, Number((quality - 0.1).toFixed(2)));
    } else if (currentScale > minScale) {
      currentScale = Math.max(
        minScale,
        Number((currentScale * DOWNSCALE_STEP).toFixed(4)),
      );
      width = Math.max(Math.round(originalWidth * currentScale), 1);
      height = Math.max(Math.round(originalHeight * currentScale), 1);
    }

    dataUrl = render(width, height, quality);
    size = estimateBase64Size(dataUrl);
  }

  if (size > MAX_BASE64_ATTACHMENT_BYTES) {
    const maxMb = (MAX_BASE64_ATTACHMENT_BYTES / 1024 / 1024).toFixed(1);
    throw new Error(
      `We couldn't compress ${file.name} below ${maxMb} MB. Try a smaller image.`,
    );
  }

  const baseName = file.name.replace(/\.[^/.]+$/, "");
  const name = baseName.length > 0 ? `${baseName}.jpg` : `${file.name}.jpg`;

  return {
    dataUrl,
    size,
    type: "image/jpeg",
    name,
  };
}

export async function prepareImageAttachment(
  file: File,
): Promise<OptimizedImageAttachment> {
  const needsCompression =
    file.type !== "image/jpeg" || file.size > COMPRESS_THRESHOLD_BYTES;

  try {
    if (!needsCompression) {
      const dataUrl = await readFileAsDataURL(file);
      const size = estimateBase64Size(dataUrl);
      if (size <= MAX_BASE64_ATTACHMENT_BYTES) {
        return {
          dataUrl,
          size,
          type: file.type,
          name: file.name,
        };
      }
    }

    return await compressImageFile(file);
  } catch (error) {
    console.warn("Failed to optimize image attachment", error);
    const dataUrl = await readFileAsDataURL(file);
    const size = estimateBase64Size(dataUrl);

    if (size > MAX_BASE64_ATTACHMENT_BYTES) {
      const maxMb = (MAX_BASE64_ATTACHMENT_BYTES / 1024 / 1024).toFixed(1);
      throw new Error(
        `${file.name} is too large to send. Please choose an image under ${maxMb} MB after compression.`,
      );
    }

    return {
      dataUrl,
      size,
      type: file.type,
      name: file.name,
    };
  }
}

