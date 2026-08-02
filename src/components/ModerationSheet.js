// ModerationSheet — engelle/engeli kaldır + şikayet (sebep seçimli) alt paneli.
// Profil, sohbet ve gönderi detayında kullanılır. PostOptionsSheet deseni.

import { useState, useEffect } from 'react';
import { Pressable, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

const REASONS = [
  { key: 'spam', label: 'Spam' },
  { key: 'inappropriate', label: 'Uygunsuz içerik' },
  { key: 'harassment', label: 'Taciz / zorbalık' },
  { key: 'misleading', label: 'Yanıltıcı' },
  { key: 'other', label: 'Diğer' },
];

export default function ModerationSheet({
  visible,
  onClose,
  targetLabel,
  reportLabel = 'Şikayet et',
  showBlock = false,
  blocked = false,
  onBlockToggle,
  onReport,
}) {
  const { theme } = useTheme();
  const { colors, typography, spacing, radius } = theme;
  const [mode, setMode] = useState('menu'); // 'menu' | 'report'

  useEffect(() => { if (visible) setMode('menu'); }, [visible]);
  if (!visible) return null;

  const Row = ({ icon, label, onPress, danger }) => (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: colors.border,
        borderRadius: radius.input,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.md,
        marginBottom: spacing.sm,
        opacity: pressed ? 0.6 : 1,
      })}
    >
      <Ionicons name={icon} size={20} color={danger ? '#E5484D' : colors.textMuted} />
      <Text style={{ marginLeft: spacing.md, fontFamily: typography.fontBodyMedium, fontSize: typography.size.body, color: danger ? '#E5484D' : colors.textPrimary }}>
        {label}
      </Text>
    </Pressable>
  );

  return (
    <View style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, zIndex: 30, elevation: 30, justifyContent: 'flex-end' }} pointerEvents="box-none">
      <Pressable onPress={onClose} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.18)' }} />
      <View style={{ backgroundColor: colors.surface, borderTopWidth: 1, borderColor: colors.border, paddingHorizontal: spacing.xl, paddingTop: spacing.lg, paddingBottom: spacing.xl }}>
        <View style={{ width: 36, height: 3, borderRadius: radius.pill, backgroundColor: colors.border, alignSelf: 'center', marginBottom: spacing.lg }} />

        {mode === 'menu' ? (
          <>
            {targetLabel ? (
              <Text style={{ fontFamily: typography.fontDisplayMedium, fontSize: typography.size.body, color: colors.textPrimary, marginBottom: spacing.md }}>
                {targetLabel}
              </Text>
            ) : null}

            {showBlock ? (
              <Row
                icon={blocked ? 'person-add-outline' : 'ban-outline'}
                label={blocked ? 'Engeli kaldır' : 'Engelle'}
                danger={!blocked}
                onPress={onBlockToggle}
              />
            ) : null}

            <Row icon="flag-outline" label={reportLabel} danger onPress={() => setMode('report')} />

            <Pressable onPress={onClose} style={({ pressed }) => ({ alignItems: 'center', paddingVertical: spacing.md, opacity: pressed ? 0.6 : 1 })}>
              <Text style={{ fontFamily: typography.fontBodyMedium, fontSize: typography.size.footnote, color: colors.textMuted }}>Vazgeç</Text>
            </Pressable>
          </>
        ) : (
          <>
            <Text style={{ fontFamily: typography.fontDisplayMedium, fontSize: typography.size.body, color: colors.textPrimary, marginBottom: spacing.xs }}>
              Sebep seç
            </Text>
            <Text style={{ fontFamily: typography.fontBody, fontSize: typography.size.caption, color: colors.textMuted, marginBottom: spacing.md }}>
              Bildirimin ekibimize iletilir.
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginBottom: spacing.md }}>
              {REASONS.map((r) => (
                <Pressable
                  key={r.key}
                  onPress={() => onReport?.(r.key)}
                  style={({ pressed }) => ({
                    borderWidth: 1,
                    borderColor: colors.border,
                    borderRadius: radius.pill,
                    paddingVertical: 7,
                    paddingHorizontal: spacing.md,
                    opacity: pressed ? 0.6 : 1,
                  })}
                >
                  <Text style={{ fontFamily: typography.fontBody, fontSize: typography.size.footnote, color: colors.textPrimary }}>{r.label}</Text>
                </Pressable>
              ))}
            </View>
            <Pressable onPress={() => setMode('menu')} style={({ pressed }) => ({ alignItems: 'center', paddingVertical: spacing.sm, opacity: pressed ? 0.6 : 1 })}>
              <Text style={{ fontFamily: typography.fontBodyMedium, fontSize: typography.size.footnote, color: colors.textMuted }}>Geri</Text>
            </Pressable>
          </>
        )}
      </View>
    </View>
  );
}
