// PostOptionsSheet — üç nokta menüsü için küçük Vayb aksiyon paneli.

import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

export default function PostOptionsSheet({ visible, onClose, onDelete, deleting }) {
  const { theme } = useTheme();
  const { colors, typography, spacing, radius } = theme;
  if (!visible) return null;

  return (
    <View
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        top: 0,
        bottom: 0,
        zIndex: 20,
        elevation: 20,
        justifyContent: 'flex-end',
      }}
      pointerEvents="box-none"
    >
      <Pressable onPress={onClose} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.18)' }} />
      <View
        style={{
          backgroundColor: colors.surface,
          borderTopWidth: 1,
          borderColor: colors.border,
          paddingHorizontal: spacing.xl,
          paddingTop: spacing.lg,
          paddingBottom: spacing.xl,
        }}
      >
        <View style={{ width: 36, height: 3, borderRadius: radius.pill, backgroundColor: colors.border, alignSelf: 'center', marginBottom: spacing.lg }} />
        <Text style={{ fontFamily: typography.fontDisplayMedium, fontSize: typography.size.body, color: colors.textPrimary, marginBottom: spacing.xs }}>
          Bu an
        </Text>
        <Text style={{ fontFamily: typography.fontBody, fontSize: typography.size.caption, color: colors.textMuted, lineHeight: 17, marginBottom: spacing.md }}>
          Profilinden ve akışlardan kaldırılır.
        </Text>

        <Pressable
          onPress={onDelete}
          disabled={deleting}
          style={({ pressed }) => ({
            flexDirection: 'row',
            alignItems: 'center',
            borderWidth: 1,
            borderColor: colors.border,
            borderRadius: radius.input,
            paddingVertical: spacing.md,
            paddingHorizontal: spacing.md,
            opacity: pressed || deleting ? 0.55 : 1,
          })}
        >
          {deleting ? <ActivityIndicator color={colors.textMuted} /> : <Ionicons name="remove-circle-outline" size={20} color={colors.textMuted} />}
          <Text style={{ marginLeft: spacing.md, fontFamily: typography.fontBodyMedium, fontSize: typography.size.body, color: colors.textPrimary }}>
            {deleting ? 'Siliniyor...' : 'Anı sil'}
          </Text>
        </Pressable>

        <Pressable onPress={onClose} disabled={deleting} style={({ pressed }) => ({ alignItems: 'center', paddingVertical: spacing.md, opacity: pressed ? 0.6 : 1 })}>
          <Text style={{ fontFamily: typography.fontBodyMedium, fontSize: typography.size.footnote, color: colors.textMuted }}>
            Vazgeç
          </Text>
        </Pressable>
      </View>
    </View>
  );
}
