// LoginScreen — kullanıcı adı + şifre ile giriş. E-posta arka planda çözülür.

import { useState } from 'react';
import { View, Text, Pressable, KeyboardAvoidingView, ScrollView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../../components/Screen';
import TextField from '../../components/TextField';
import GradientButton from '../../components/GradientButton';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';

export default function LoginScreen({ navigation }) {
  const { theme } = useTheme();
  const { colors, typography, spacing } = theme;
  const { signIn, mesajCevir } = useAuth();

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const gecerli = username.trim().length >= 3 && password.length >= 6;

  const handleLogin = async () => {
    if (!gecerli || loading) return;
    setError('');
    setLoading(true);
    try {
      await signIn({ username, password });
      // Başarılıysa AuthContext oturumu yakalar, navigasyon otomatik değişir.
    } catch (e) {
      setError(mesajCevir(e.code));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen padded={false}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, paddingHorizontal: spacing.xl, paddingTop: spacing.xxl, paddingBottom: spacing.xl }}
          keyboardShouldPersistTaps="handled"
        >
          <Text style={{ fontFamily: typography.fontDisplay, fontSize: typography.size.display, color: colors.textPrimary, marginBottom: spacing.xs }}>
            Tekrar Hoşgeldin
          </Text>
          <Text style={{ fontFamily: typography.fontBody, fontSize: typography.size.footnote, color: colors.textMuted, marginBottom: spacing.xxl }}>
            Anları kaldığın yerden keşfet.
          </Text>

          <TextField
            label="Kullanıcı adı"
            value={username}
            onChangeText={setUsername}
            placeholder="kullaniciadi"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="username"
            icon="at-outline"
          />
          <TextField
            label="Şifre"
            value={password}
            onChangeText={setPassword}
            placeholder="••••••"
            secureTextEntry
            autoComplete="password"
            icon="lock-closed-outline"
          />

          {error ? (
            <Text style={{ fontFamily: typography.fontBody, fontSize: typography.size.footnote, color: colors.accent, marginBottom: spacing.md }}>
              {error}
            </Text>
          ) : null}

          <View style={{ marginTop: spacing.sm }}>
            <GradientButton label="Giriş yap" onPress={handleLogin} loading={loading} disabled={!gecerli} />
          </View>

          <Pressable onPress={() => navigation.navigate('ForgotPassword')} style={{ marginTop: spacing.lg, alignSelf: 'center' }} hitSlop={8}>
            <Text style={{ fontFamily: typography.fontBodyMedium, fontSize: typography.size.footnote, color: colors.accent }}>
              Şifremi unuttum
            </Text>
          </Pressable>

          <Pressable onPress={() => navigation.navigate('Register')} style={{ marginTop: spacing.xl, alignSelf: 'center' }} hitSlop={8}>
            <Text style={{ fontFamily: typography.fontBody, fontSize: typography.size.footnote, color: colors.textMuted }}>
              Hesabın yok mu? <Text style={{ fontFamily: typography.fontBodyMedium, color: colors.accent }}>Kayıt ol</Text>
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
