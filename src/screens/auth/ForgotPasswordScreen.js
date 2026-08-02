// ForgotPasswordScreen — e-posta göstermeden kullanıcı adıyla şifre sıfırlama.

import { useState } from 'react';
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../../components/Screen';
import TextField from '../../components/TextField';
import GradientButton from '../../components/GradientButton';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';

export default function ForgotPasswordScreen({ navigation }) {
  const { theme } = useTheme();
  const { colors, typography, spacing } = theme;
  const { requestPasswordReset } = useAuth();
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const submit = async () => {
    if (username.trim().length < 3 || loading) return;
    setLoading(true);
    try {
      await requestPasswordReset(username);
    } catch (e) {
      // Hesap varlığını açığa çıkarmamak için aynı sonucu göster.
    } finally {
      setSent(true);
      setLoading(false);
    }
  };

  return (
    <Screen padded={false}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={{ flexGrow: 1, paddingHorizontal: spacing.xl, paddingTop: spacing.xxl, paddingBottom: spacing.xl }} keyboardShouldPersistTaps="handled">
          <Pressable onPress={() => navigation.goBack()} hitSlop={8} style={{ marginBottom: spacing.xxl }}>
            <Ionicons name="chevron-back" size={26} color={colors.textPrimary} />
          </Pressable>
          <Text style={{ fontFamily: typography.fontDisplay, fontSize: typography.size.display, color: colors.textPrimary, marginBottom: spacing.xs }}>Şifreni yenile</Text>
          <Text style={{ fontFamily: typography.fontBody, fontSize: typography.size.footnote, color: colors.textMuted, lineHeight: 21, marginBottom: spacing.xxl }}>
            Kullanıcı adını ya da e-postanı yaz. Hesabın varsa şifre yenileme bağlantısı göndeririz.
          </Text>
          <TextField label="Kullanıcı adı veya e-posta" value={username} onChangeText={(value) => { setUsername(value); setSent(false); }} placeholder="kullaniciadi veya e-posta" autoCapitalize="none" autoComplete="username" icon="at-outline" />
          {sent ? <Text style={{ fontFamily: typography.fontBody, fontSize: typography.size.footnote, color: colors.textMuted, lineHeight: 21, marginBottom: spacing.lg }}>Hesap bilgileri eşleşiyorsa şifre yenileme bağlantısı gönderildi. Gelen kutunu ve spam klasörünü kontrol et.</Text> : null}
          <GradientButton label="Bağlantı gönder" onPress={submit} loading={loading} disabled={username.trim().length < 3} />
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
