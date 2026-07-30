/**
 * Opening something outside the app. Every caller is a row the teacher tapped,
 * so a failure must stay quiet — a resource list that throws an unhandled
 * rejection because a device has no dialler is worse than one that does nothing.
 */

import { Linking, Platform } from 'react-native';

export function openLink(href: string) {
  /**
   * On the web this goes through a real anchor rather than `Linking.openURL`,
   * which calls `window.open`. A sandboxed iframe blocks `window.open` unless
   * it was granted popups, so every outbound link in the published preview did
   * nothing at all — no error, no navigation. An anchor click is what the host
   * page listens for, and it is also what a plain browser handles natively.
   */
  if (Platform.OS === 'web' && typeof document !== 'undefined') {
    const a = document.createElement('a');
    a.href = href;
    // tel: and sms: must stay in place; a new tab would be a dead blank page.
    if (/^https?:/i.test(href)) {
      a.target = '_blank';
      a.rel = 'noopener noreferrer';
    }
    document.body.appendChild(a);
    a.click();
    a.remove();
    return;
  }

  Linking.openURL(href).catch(() => {
    // No handler for tel: on this device, or the browser blocked the hand-off.
  });
}
