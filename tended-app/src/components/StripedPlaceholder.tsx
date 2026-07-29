import React from 'react';
import { StyleSheet, View } from 'react-native';
import { color } from '../theme';
import { MonoLabel } from './ui';

/**
 * Stands in for a post image. The prototype used a 135° repeating-linear-gradient
 * with 6px bands; React Native has no repeating gradients, so the same stripes
 * are drawn as rotated bars — 6px wide on a 12px pitch measured perpendicular,
 * which is 6/cos45 wide on a 12/cos45 pitch measured horizontally.
 */
const PITCH = 12 / Math.cos(Math.PI / 4);
const BAND = 6 / Math.cos(Math.PI / 4);
const COUNT = 14;

export function StripedPlaceholder({ width = 96 }: { width?: number }) {
  return (
    <View style={[styles.wrap, { width }]}>
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {Array.from({ length: COUNT }, (_, i) => (
          <View
            key={i}
            style={[styles.band, { left: (i - 4) * PITCH, width: BAND }]}
          />
        ))}
      </View>
      <MonoLabel size={7.5} em={0} tone={color.faint} style={styles.caption}>
        POST IMAGE
      </MonoLabel>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: '#f2f0ea',
    overflow: 'hidden',
    justifyContent: 'flex-end',
    padding: 6,
  },
  band: {
    position: 'absolute',
    top: -120,
    height: 400,
    backgroundColor: '#eae7e0',
    transform: [{ rotate: '45deg' }],
  },
  caption: {
    zIndex: 1,
  },
});
