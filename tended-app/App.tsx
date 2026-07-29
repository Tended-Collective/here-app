import { useFonts } from 'expo-font';
import { StatusBar } from 'expo-status-bar';
import React from 'react';
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

export default function App() {
  const [fontsLoaded] = useFonts({
    Newsreader_300Light,
    Newsreader_400Regular,
    IBMPlexMono_500Medium,
    IBMPlexMono_600SemiBold,
  });

  if (!fontsLoaded) {
    // Hold on the ground colour rather than flashing fallback type.
    return <View style={{ flex: 1, backgroundColor: color.ground }} />;
  }

  return (
    <SafeAreaProvider>
      <StoreProvider>
        <PhoneFrame>
          <AppShell />
        </PhoneFrame>
      </StoreProvider>
      <StatusBar style="dark" />
    </SafeAreaProvider>
  );
}
