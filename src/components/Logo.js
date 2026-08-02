// Logo — "Vayb" kelime markası + gün batımı gradyan aksanı
// Fotoğraf kral; logo sade ama sıcak. Space Grotesk display fontu.

import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';

export default function Logo({ size = 'display' }) {
  const { theme } = useTheme();
  const { typography, colors, gradients, spacing, radius } = theme;
  const fontSize = typography.size[size] ?? typography.size.display;

  return (
    <View style={styles.row}>
      {/* gün batımı gradyan noktası */}
      <LinearGradient
        colors={gradients.sunset}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          width: fontSize * 0.5,
          height: fontSize * 0.5,
          borderRadius: radius.pill,
          marginRight: spacing.sm,
        }}
      />
      <Text
        style={{
          fontFamily: typography.fontDisplay,
          fontSize,
          color: colors.textPrimary,
          letterSpacing: -0.5,
        }}
      >
        Vayb
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
});
