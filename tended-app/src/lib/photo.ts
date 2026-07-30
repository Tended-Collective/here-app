/**
 * Picking a photo for a feed post.
 *
 * The picked image is downscaled and re-encoded before it is ever stored. Two
 * reasons: a modern phone photo is several megabytes and the whole app state
 * lives in one AsyncStorage row, and re-encoding through a canvas drops the
 * EXIF block — which on a photo taken in a classroom carries GPS coordinates
 * and a capture timestamp. An anonymous feed cannot ship those.
 *
 * Web is implemented here because that is what the preview build runs. On a
 * device this wants expo-image-picker, which is not a dependency yet; the seam
 * is `PICKER_CONFIGURED` and the native branch is a no-op until it is.
 */

import { Platform } from 'react-native';

/** Longest edge, in pixels. Enough to read a photo at feed width on a 3× screen. */
const MAX_EDGE = 1080;

/** JPEG quality. Low enough to keep a post well under a few hundred KB. */
const QUALITY = 0.72;

/**
 * False until expo-image-picker is installed and configured. The composer hides
 * its camera button on platforms where picking cannot work, rather than
 * offering a button that does nothing.
 */
export const PICKER_CONFIGURED = Platform.OS === 'web';

/**
 * Opens the picker and returns a data URI, or null if the teacher cancelled or
 * the platform cannot pick.
 */
export async function pickPhoto(): Promise<string | null> {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return null;

  const file = await chooseFile();
  if (!file) return null;
  return downscale(file);
}

/** One `<input type="file">`, used once and thrown away. */
function chooseFile(): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.style.display = 'none';

    let settled = false;
    const finish = (file: File | null) => {
      if (settled) return;
      settled = true;
      input.remove();
      resolve(file);
    };

    input.addEventListener('change', () => finish(input.files?.[0] ?? null));
    // Cancelling the OS dialog fires no `change` in most browsers. `cancel` is
    // not universal either, so the window regaining focus is the backstop —
    // without it the promise would hang and the button would stay spinning.
    input.addEventListener('cancel', () => finish(null));
    window.addEventListener(
      'focus',
      () => setTimeout(() => finish(input.files?.[0] ?? null), 400),
      { once: true },
    );

    document.body.appendChild(input);
    input.click();
  });
}

/** Draw it down to MAX_EDGE and re-encode as JPEG. */
function downscale(file: File): Promise<string | null> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, MAX_EDGE / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(img.width * scale));
      canvas.height = Math.max(1, Math.round(img.height * scale));

      const ctx = canvas.getContext('2d');
      if (!ctx) return resolve(null);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      try {
        resolve(canvas.toDataURL('image/jpeg', QUALITY));
      } catch {
        // A cross-origin source would taint the canvas. Nothing to recover.
        resolve(null);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(null);
    };

    img.src = url;
  });
}
