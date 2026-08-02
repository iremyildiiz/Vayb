// TextField — tema uyumlu etiketli metin girişi.
// Şifre alanları için göster/gizle desteği var.

import { useState } from 'react';
import { View, Text, TextInput, Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

export default function TextField({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry = false,
  autoCapitalize = 'none',
  keyboardType = 'default',
  autoComplete,
  icon,
  helperText,
  errorText,
}) {
  const { theme } = useTheme();
  const { colors, typography, spacing, radius } = theme;
  const [hidden, setHidden] = useState(secureTextEntry);
  const [focused, setFocused] = useState(false);

  return (
    <View style={{ marginBottom: spacing.lg }}>
      {label ? (
        <Text
          style={{
            fontFamily: typography.fontBodyMedium,
            fontSize: typography.size.footnote,
            color: colors.textMuted,
            marginBottom: spacing.xs,
          }}
        >
          {label}
        </Text>
      ) : null}

      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: colors.surface,
          borderWidth: 1,
          borderColor: focused ? colors.accent : colors.border,
          borderRadius: radius.input,
          paddingHorizontal: spacing.md,
        }}
      >
        {icon ? (
          <Ionicons name={icon} size={18} color={colors.textMuted} style={{ marginRight: spacing.sm }} />
        ) : null}

        <TextInput
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          secureTextEntry={hidden}
          autoCapitalize={autoCapitalize}
          autoCorrect={false}
          keyboardType={keyboardType}
          autoComplete={autoComplete}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            flex: 1,
            paddingVertical: spacing.md,
            fontFamily: typography.fontBody,
            fontSize: typography.size.body,
            color: colors.textPrimary,
          }}
        />

        {secureTextEntry ? (
          <Pressable onPress={() => setHidden((h) => !h)} hitSlop={8}>
            <Ionicons name={hidden ? 'eye-outline' : 'eye-off-outline'} size={18} color={colors.textMuted} />
          </Pressable>
        ) : null}
      </View>

      {errorText || helperText ? (
        <Text
          style={{
            fontFamily: typography.fontBody,
            fontSize: typography.size.caption,
            color: errorText ? colors.accent : colors.textMuted,
            marginTop: spacing.xs,
          }}
        >
          {errorText || helperText}
        </Text>
      ) : null}
    </View>
  );
}
