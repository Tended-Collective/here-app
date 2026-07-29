/**
 * On a phone the app simply fills the screen. On a wide screen — the design
 * canvas case — it is drawn inside the 402×874 device from the mock, notch and
 * home indicator included, scaled down if the window is shorter than the device.
 */

import React, { createContext, useContext, useEffect, useState } from 'react';
import { Platform, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { color, DEVICE, STATUS_BAR_HEIGHT, TAB_BAR_HEIGHT } from '../theme';

const DEVICE_OUTER_WIDTH = DEVICE.width + DEVICE.bezel * 2;
const DEVICE_OUTER_HEIGHT = DEVICE.height + DEVICE.bezel * 2;

type Chrome = {
  /** True when the app is drawn inside the device mock. */
  framed: boolean;
  /** Space to leave clear at the top of scrolling content. */
  topInset: number;
  /** Height of the tab bar, including any home-indicator area. */
  tabBarHeight: number;
};

const ChromeContext = createContext<Chrome>({
  framed: false,
  topInset: STATUS_BAR_HEIGHT,
  tabBarHeight: TAB_BAR_HEIGHT,
});

export const useChrome = () => useContext(ChromeContext);

export function PhoneFrame({ children }: { children: React.ReactNode }) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  // Only the web build ever gets a window wide enough to be worth framing.
  const framed = Platform.OS === 'web' && width >= DEVICE_OUTER_WIDTH + 80;

  if (!framed) {
    const chrome: Chrome = {
      framed: false,
      topInset: Math.max(insets.top, 20),
      tabBarHeight: Math.max(TAB_BAR_HEIGHT, 52 + insets.bottom),
    };
    return (
      <ChromeContext.Provider value={chrome}>
        <View style={styles.fullScreen}>{children}</View>
      </ChromeContext.Provider>
    );
  }

  const scale = Math.min(1, (height - 32) / DEVICE_OUTER_HEIGHT);
  const chrome: Chrome = {
    framed: true,
    topInset: STATUS_BAR_HEIGHT,
    tabBarHeight: TAB_BAR_HEIGHT,
  };

  return (
    <ChromeContext.Provider value={chrome}>
      <View style={styles.canvas}>
        <View style={[styles.device, { transform: [{ scale }] }]}>
          <View style={styles.screen}>
            <View style={styles.notch} />
            <StatusBar />
            {children}
            <View style={styles.homeIndicator} />
          </View>
        </View>
      </View>
    </ChromeContext.Provider>
  );
}

/** The mock device's status bar: live clock on the left, battery on the right. */
function StatusBar() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(id);
  }, []);

  const time = now.toLocaleTimeString('en-GB', { hour: 'numeric', minute: '2-digit' });

  return (
    <View style={styles.statusBar} pointerEvents="none">
      <Text style={styles.statusTime}>{time}</Text>
      <View style={styles.battery}>
        <View style={styles.batteryFill} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fullScreen: {
    flex: 1,
    backgroundColor: color.ground,
  },
  canvas: {
    flex: 1,
    backgroundColor: color.canvas,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  device: {
    width: DEVICE_OUTER_WIDTH,
    height: DEVICE_OUTER_HEIGHT,
    borderRadius: DEVICE.radius,
    backgroundColor: color.device,
    padding: DEVICE.bezel,
    boxShadow: '0 18px 50px rgba(0,0,0,0.22)',
  },
  screen: {
    flex: 1,
    borderRadius: DEVICE.screenRadius,
    overflow: 'hidden',
    backgroundColor: color.ground,
  },
  notch: {
    position: 'absolute',
    top: 9,
    alignSelf: 'center',
    width: 110,
    height: 31,
    borderRadius: 20,
    backgroundColor: color.device,
    zIndex: 6,
  },
  statusBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: STATUS_BAR_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 30,
    zIndex: 5,
  },
  statusTime: {
    fontSize: 13,
    fontWeight: '600',
    color: color.ink,
  },
  battery: {
    width: 24,
    height: 12,
    borderWidth: 1,
    borderColor: color.ink,
    borderRadius: 3,
    padding: 1.5,
    opacity: 0.55,
  },
  batteryFill: {
    width: '72%',
    height: '100%',
    backgroundColor: color.ink,
    borderRadius: 1,
  },
  homeIndicator: {
    position: 'absolute',
    bottom: 8,
    alignSelf: 'center',
    width: 136,
    height: 5,
    borderRadius: 99,
    backgroundColor: 'rgba(0,0,0,0.22)',
    zIndex: 6,
  },
});
