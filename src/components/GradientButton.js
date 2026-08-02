// GradientButton — gün batımı gradyanlı birincil buton (yükleme durumu destekli).
// İkincil (outline) varyantı da var: variant="ghost".

import { Pressable, Text, ActivityIndicator, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '../context/ThemeContext';

export default function GradientButton({ label, onPress, loading = false, disabled = false, variant = 'solid' }) {
  const { theme } = useTheme();
  const { colors, typography, spacing, radius, gradients } = theme;
  const isGhost = variant === 'ghost';
  const inactive = disabled || loading;

  const content = isGhost ? (
    <View
      style={{
        paddingVertical: spacing.md + 2,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: radius.button,
        borderWidth: 1,
        borderColor: colors.border,
      }}
    >
      <Text style={{ fontFamily: typography.fontBodyMedium, fontSize: typography.size.body, color: colors.textPrimary }}>
        {label}
      </Text>
    </View>
  ) : (
    <LinearGradient
      colors={gradients.sunset}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={{
        paddingVertical: spacing.md + 2,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: radius.button,
      }}
    >
      {loading ? (
        <ActivityIndicator color="#FFFFFF" />
      ) : (
        <Text style={{ fontFamily: typography.fontBodyMedium, fontSize: typography.size.body, color: '#FFFFFF' }}>
          {label}
        </Text>
      )}
    </LinearGradient>
  );

  return (
    <Pressable
      onPress={onPress}
      disabled={inactive}
      style={({ pressed }) => ({ opacity: inactive ? 0.5 : pressed ? 0.85 : 1 })}
    >
      {content}
    </Pressable>
  );
}
