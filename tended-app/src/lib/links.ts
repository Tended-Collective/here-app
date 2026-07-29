/**
 * Opening something outside the app. Every caller is a row the teacher tapped,
 * so a failure must stay quiet — a resource list that throws an unhandled
 * rejection because a device has no dialler is worse than one that does nothing.
 */

import { Linking } from 'react-native';

export function openLink(href: string) {
  Linking.openURL(href).catch(() => {
    // No handler for tel: on this device, or the browser blocked the hand-off.
  });
}
