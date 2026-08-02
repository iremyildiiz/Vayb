// Screen — tema renkleriyle stillenmiş güvenli alan sarmalayıcı.
// Her ekran bunu kullanır; zemin nefes alır, üst çentik/altbar hesaba katılır.

import { View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useTheme } from '../context/ThemeContext';

export default function Screen({ children, style, padded = true }) {
  const { theme, isDark } = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.flex, { backgroundColor: theme.colors.bg }]}>
      {/* karanlık modda açık ikonlar, aydınlıkta koyu */}
      <StatusBar style={isDark ? 'light' : 'dark'} />
      <View
        style={[
          styles.flex,
          {
            paddingTop: insets.top + (padded ? theme.spacing.lg : 0),
            paddingBottom: padded ? theme.spacing.lg : 0,
            paddingHorizontal: padded ? theme.spacing.xl : 0,
          },
          style,
        ]}
      >
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
});
