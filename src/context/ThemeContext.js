// ThemeContext — Vayb açık/karanlık tema yönetimi
//
// Sistemin görünüm ayarına (useColorScheme) bağlı çalışır; kullanıcı isterse
// manuel olarak açık/karanlık arasında geçiş yapabilir (Ayarlar'daki tema
// anahtarı ileride bunu kullanacak). theme.js'teki getTheme ile üretilir.

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { useColorScheme } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getTheme } from '../theme/theme';

const ThemeContext = createContext(null);
const STORAGE_KEY = 'vayb:themeOverride'; // 'light' | 'dark' | 'system'

export function ThemeProvider({ children }) {
  const systemScheme = useColorScheme(); // 'light' | 'dark' | null
  // override: null → sistemi takip et, 'light' | 'dark' → manuel seçim
  const [override, setOverride] = useState(null);

  // Kayıtlı tercihi uygulama açılışında geri yükle (uygulamayı kapatıp açınca kalsın).
  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((v) => { if (v === 'light' || v === 'dark') setOverride(v); })
      .catch(() => {});
  }, []);

  const scheme = override ?? systemScheme ?? 'light';

  const value = useMemo(() => {
    // Seçimi hem state'e yaz hem kalıcı kaydet.
    const persist = (next) => {
      setOverride(next);
      AsyncStorage.setItem(STORAGE_KEY, next ?? 'system').catch(() => {});
    };
    const theme = getTheme(scheme);
    return {
      theme,
      scheme,
      isDark: scheme === 'dark',
      isSystem: override === null,
      // açık ↔ karanlık geçişi (manuel)
      toggleTheme: () => persist(scheme === 'dark' ? 'light' : 'dark'),
      // manuel seçim: 'light' | 'dark'
      setScheme: (next) => persist(next),
      // sistemin ayarını takip etmeye geri dön
      useSystemTheme: () => persist(null),
    };
  }, [scheme, override]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme, ThemeProvider içinde kullanılmalı.');
  return ctx;
}
