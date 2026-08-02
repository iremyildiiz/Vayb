// theme.js — Vayb tasarım dili
// Gün batımı paleti · aydınlık + karanlık mod · spacing / radius / tipografi
//
// Kullanım:
//   import { getTheme } from './src/theme/theme';
//   import { useColorScheme } from 'react-native';
//   const scheme = useColorScheme();           // 'light' | 'dark'
//   const t = getTheme(scheme);
//   ...style={{ backgroundColor: t.colors.bg, color: t.colors.textPrimary }}

// --- Marka aksanları (her iki modda ortak) ---
export const sunset = {
  amber: '#FFC48C',   // gradyan üst ucu — şeftali
  orange: '#FF875A',  // birincil aksan — sıcak turuncu
  pink: '#FF7A5C',    // ikincil aksan — sıcak mercan (pembeden iyice uzaklaştırıldı)
};

// Butonlar / vurgular için gün batımı gradyanı (expo-linear-gradient ile kullan)
// Şeftali → sıcak turuncu → mercan. Mor/magenta yok — gün batımı kimliği korunur.
export const gradients = {
  sunset: ['#FFC48C', '#FF875A', '#FF7A5C'],
};

// --- Aydınlık mod ---
const lightColors = {
  bg: '#FFFBF8',          // sıcak beyaz zemin
  surface: '#FFFFFF',     // kart / yüzey
  textPrimary: '#1F1A24',
  textMuted: '#8A837C',
  border: '#F1E9E4',
  accent: sunset.pink,    // ana etkileşim rengi (beğeni, link, vurgu)
  ...sunset,
};

// --- Karanlık mod ---
const darkColors = {
  bg: '#141110',          // sıcak siyaha yakın (mor alt ton azaltıldı)
  surface: '#1E1A17',
  textPrimary: '#F7F2F5',
  textMuted: '#A39C95',
  border: '#2C2621',
  accent: sunset.pink,
  ...sunset,
};

// --- Ölçüler ---
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

export const radius = {
  card: 20,
  button: 16,
  input: 12,
  pill: 999,   // tam yuvarlak (avatar, chip)
};

// --- Tipografi ---
// Font isimleri @expo-google-fonts paketlerinin export ettiği anahtarlarla eşleşir.
export const typography = {
  fontDisplay: 'SpaceGrotesk_700Bold',   // başlıklar / logo
  fontDisplayMedium: 'SpaceGrotesk_500Medium',
  fontBody: 'Inter_400Regular',          // gövde
  fontBodyMedium: 'Inter_500Medium',
  size: {
    caption: 11,
    footnote: 13,
    body: 15,
    title: 20,
    display: 30,
  },
};

// --- Tema seçici ---
export const getTheme = (scheme) => ({
  colors: scheme === 'dark' ? darkColors : lightColors,
  isDark: scheme === 'dark',
  sunset,
  gradients,
  spacing,
  radius,
  typography,
});

export default getTheme;
