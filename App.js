// App.js — Vayb kök bileşeni
// Fontları yükler, tema + güvenli alan sağlayıcılarını sarar, navigasyonu başlatır.

import { useState } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import {
  SpaceGrotesk_500Medium,
  SpaceGrotesk_700Bold,
} from '@expo-google-fonts/space-grotesk';
import { Inter_400Regular, Inter_500Medium } from '@expo-google-fonts/inter';

import { ThemeProvider, useTheme } from './src/context/ThemeContext';
import { AuthProvider } from './src/context/AuthContext';
import RootNavigator from './src/navigation/RootNavigator';
import LaunchAnimation from './src/components/LaunchAnimation';

// Font yüklenirken temalı bekleme ekranı (beyaz çakma olmasın).
function AppBody() {
  const { theme } = useTheme();
  const [showLaunch, setShowLaunch] = useState(true);

  const [fontsLoaded] = useFonts({
    SpaceGrotesk_500Medium,
    SpaceGrotesk_700Bold,
    Inter_400Regular,
    Inter_500Medium,
  });

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={theme.colors.accent} />
      </View>
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <RootNavigator />
      {showLaunch ? <LaunchAnimation onDone={() => setShowLaunch(false)} /> : null}
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <AuthProvider>
          <AppBody />
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
