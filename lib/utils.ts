export function cn(...inputs: Array<false | null | undefined | string>) {
  return inputs.filter(Boolean).join(" ");
}

export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) {
    return "0 B";
  }

  const UNITS = ["B", "KB", "MB", "GB", "TB"] as const;
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < UNITS.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }

  const formatted =
    size >= 10 || unitIndex === 0 ? size.toFixed(0) : size.toFixed(1);

  return `${formatted} ${UNITS[unitIndex]}`;
}


