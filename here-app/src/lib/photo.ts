/**
 * Picking a photo for a feed post.
 *
 * The picked image is downscaled and re-encoded before it is ever stored. Two
 * reasons: a modern phone photo is several megabytes and the whole app state
 * lives in one AsyncStorage row, and re-encoding drops the EXIF block — which on
 * a photo taken in a classroom carries GPS coordinates and a capture timestamp.
 * A feed of school staff cannot ship those.
 *
 * ─── Why native does not just hand the picker's file straight through ─────────
 *
 * `expo-image-picker` has a fast path: when nothing asks it to modify the image
 * (`quality >= 1`, no editing) it copies the original file byte for byte and
 * returns that, EXIF and GPS intact. Passing `quality: 0.72` happens to defeat
 * that, because a re-encode through UIImage loses the metadata dictionary — but
 * relying on it would mean the privacy promise depends on an undocumented
 * branch inside a dependency, and a version bump could quietly reinstate the
 * original file.
 *
 * So the picker is asked for the image and nothing else, and `expo-image-
 * manipulator` does the resize and the JPEG encode explicitly. The output is a
 * new file built from decoded pixels, which cannot carry the source's metadata
 * whatever the picker decided to hand over. Same guarantee as the canvas on web,
 * for the same reason, made by us rather than inherited.
 */

import { Platform } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';

/** Longest edge, in pixels. Enough to read a photo at feed width on a 3× screen. */
const MAX_EDGE = 1080;

/** JPEG quality. Low enough to keep a post well under a few hundred KB. */
const QUALITY = 0.72;

/**
 * Whether this platform can pick at all. True everywhere now — the composer
 * hides its photo button where it is false rather than offering a button that
 * does nothing.
 */
export const PICKER_CONFIGURED = true;

/**
 * Opens the picker and returns a data URI, or null if the teacher cancelled, or
 * declined access, or the image could not be read.
 */
export async function pickPhoto(): Promise<string | null> {
  if (Platform.OS === 'web') {
    if (typeof document === 'undefined') return null;
    const file = await chooseFile();
    if (!file) return null;
    return downscaleOnWeb(file);
  }

  return pickOnDevice();
}

// ─── Native ──────────────────────────────────────────────────────────────────

async function pickOnDevice(): Promise<string | null> {
  /**
   * Ask only when iOS has not already answered. `requestMediaLibraryPermissions`
   * is safe to call repeatedly — after a denial it returns the denial without
   * showing anything — but calling it unprompted on a screen the teacher did not
   * tap would put a permission dialog in front of someone who never asked for
   * one.
   *
   * A refusal returns null and the composer simply carries on without a photo.
   * There is deliberately no "go to Settings" nag: a post does not need a photo,
   * and being asked twice for something optional is how an app earns a denial
   * it never recovers from.
   */
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) return null;

  const picked = await ImagePicker.launchImageLibraryAsync({
    // 'images' only — no video, no live photos. A live photo would smuggle in a
    // paired video, and the feed shows one still image per post.
    mediaTypes: ['images'],
    allowsMultipleSelection: false,
    // Not asked for, so the asset comes back without a metadata dictionary. The
    // real guarantee is the re-encode below; this just avoids reading it.
    exif: false,
    // No base64 from the picker: it would be the *original* file's bytes, which
    // is exactly what must not be stored. The manipulator produces ours.
    base64: false,
    // No crop UI. One tap fewer, and cropping is not what a post is about.
    allowsEditing: false,
  });

  if (picked.canceled) return null;

  const asset = picked.assets?.[0];
  if (!asset?.uri) return null;

  try {
    const context = ImageManipulator.manipulate(asset.uri);

    // Only shrink, never enlarge. Resizing on one axis keeps the aspect ratio,
    // so the longest edge is the one to constrain.
    const longest = Math.max(asset.width ?? 0, asset.height ?? 0);
    if (longest > MAX_EDGE) {
      const portrait = (asset.height ?? 0) >= (asset.width ?? 0);
      context.resize(portrait ? { height: MAX_EDGE } : { width: MAX_EDGE });
    }

    const image = await context.renderAsync();
    const saved = await image.saveAsync({
      compress: QUALITY,
      format: SaveFormat.JPEG,
      base64: true,
    });

    // A data URI, so a post is self-contained in the store exactly as it is on
    // web. A file:// path would break the moment iOS cleared the cache
    // directory, which it does whenever it feels like it.
    return saved.base64 ? `data:image/jpeg;base64,${saved.base64}` : null;
  } catch {
    // A corrupt file, or an iCloud photo that never finished downloading.
    return null;
  }
}

// ─── Web ─────────────────────────────────────────────────────────────────────

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
function downscaleOnWeb(file: File): Promise<string | null> {
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
