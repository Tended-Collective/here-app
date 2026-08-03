import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import React, { useCallback } from 'react';
import { View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { IBMPlexMono_500Medium } from '@expo-google-fonts/ibm-plex-mono/500Medium';
import { IBMPlexMono_600SemiBold } from '@expo-google-fonts/ibm-plex-mono/600SemiBold';
import { Newsreader_300Light } from '@expo-google-fonts/newsreader/300Light';
import { Newsreader_400Regular } from '@expo-google-fonts/newsreader/400Regular';

import { AppShell } from './src/AppShell';
import { PhoneFrame } from './src/components/PhoneFrame';
import { StoreProvider } from './src/store';
import { color } from './src/theme';

/**
 * Hold the splash screen until the type is ready.
 *
 * Without this the native splash hides as soon as the JS bundle mounts, and the
 * app then sits on a blank ground-coloured screen while four font files load —
 * so a cold start reads as "it opened to nothing" rather than as loading. Called
 * at module scope because it has to run before the first frame.
 *
 * `catch` rather than `await`: if it fails there is nothing to be done about it,
 * and an unhandled rejection at module scope would take the app down over a
 * splash screen.
 */
SplashScreen.preventAutoHideAsync().catch(() => {});

// Fade rather than cut. The splash mark sits on the same #f6f5f2 the app opens
// on, so there is nothing to hide behind a hard swap. iOS only; ignored elsewhere.
SplashScreen.setOptions({ duration: 300, fade: true });

export default function App() {
  const [fontsLoaded, fontError] = useFonts({
    Newsreader_300Light,
    Newsreader_400Regular,
    IBMPlexMono_500Medium,
    IBMPlexMono_600SemiBold,
  });

  /**
   * Released on the first laid-out frame rather than in an effect, which can
   * fire before the tree has painted and would put the blank frame back.
   *
   * A font that fails to load must still let go of the splash: missing type is a
   * degraded app, a splash that never lifts is no app at all.
   */
  const onReady = useCallback(() => {
    if (fontsLoaded || fontError) SplashScreen.hideAsync().catch(() => {});
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    // Hold on the ground colour rather than flashing fallback type. On native
    // this sits behind the splash; on web it is the whole story.
    return <View style={{ flex: 1, backgroundColor: color.ground }} />;
  }

  return (
    <SafeAreaProvider>
      <View style={{ flex: 1 }} onLayout={onReady}>
        <StoreProvider>
          <PhoneFrame>
            <AppShell />
          </PhoneFrame>
        </StoreProvider>
      </View>
      <StatusBar style="dark" />
    </SafeAreaProvider>
  );
}
