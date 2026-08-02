// RegisterScreen — isim + kullanıcı adı + e-posta + şifre ile kayıt.

import { useState } from 'react';
import { View, Text, Pressable, KeyboardAvoidingView, ScrollView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../../components/Screen';
import TextField from '../../components/TextField';
import GradientButton from '../../components/GradientButton';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { normalizeUsername, validateUsername } from '../../services/users';

export default function RegisterScreen({ navigation }) {
  const { theme } = useTheme();
  const { colors, typography, spacing } = theme;
  const { signUp, mesajCevir } = useAuth();

  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [accepted, setAccepted] = useState(false);

  const usernameError = username ? validateUsername(username) : '';
  const emailClean = email.trim();
  const emailError = emailClean && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailClean) ? 'Geçerli bir e-posta yaz.' : '';
  const passwordError = password && password.length < 6 ? 'Şifre en az 6 karakter olmalı.' : '';
  const gecerli =
    displayName.trim().length >= 2 &&
    username.length >= 3 &&
    !usernameError &&
    !emailError &&
    emailClean.length > 3 &&
    password.length >= 6 &&
    accepted;

  const handleRegister = async () => {
    if (!gecerli || loading) return;
    setError('');
    setLoading(true);
    try {
      await signUp({ email, password, displayName, username });
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
            Vayb'e katıl
          </Text>
          <Text style={{ fontFamily: typography.fontBody, fontSize: typography.size.footnote, color: colors.textMuted, marginBottom: spacing.xxl }}>
            Gördüğün dünyayı paylaşmaya başla.
          </Text>

          <TextField
            label="Ad Soyad"
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="Adın"
            autoCapitalize="words"
            icon="person-outline"
          />
          <TextField
            label="Kullanıcı adı"
            value={username}
            onChangeText={(text) => setUsername(normalizeUsername(text))}
            placeholder="kullaniciadi"
            autoCapitalize="none"
            autoCorrect={false}
            autoComplete="username"
            icon="at-outline"
            helperText={!username ? 'Türkçe karakter kullanabilirsin; boşluk kullanma.' : ''}
            errorText={usernameError}
          />
          <TextField
            label="E-posta"
            value={email}
            onChangeText={setEmail}
            placeholder="ornek@eposta.com"
            keyboardType="email-address"
            autoComplete="email"
            icon="mail-outline"
            errorText={emailError}
          />
          <TextField
            label="Şifre"
            value={password}
            onChangeText={setPassword}
            placeholder="En az 6 karakter"
            secureTextEntry
            autoComplete="password-new"
            icon="lock-closed-outline"
            errorText={passwordError}
          />

          {error ? (
            <Text style={{ fontFamily: typography.fontBody, fontSize: typography.size.footnote, color: colors.accent, marginBottom: spacing.md }}>
              {error}
            </Text>
          ) : null}

          <View style={{ flexDirection: 'row', alignItems: 'flex-start', marginBottom: spacing.md }}>
            <Pressable onPress={() => setAccepted((v) => !v)} hitSlop={8} style={{ paddingTop: 1 }} accessibilityLabel="Koşulları kabul et">
              <Ionicons name={accepted ? 'checkbox' : 'square-outline'} size={20} color={accepted ? colors.accent : colors.textMuted} />
            </Pressable>
            <Text style={{ flex: 1, marginLeft: spacing.sm, fontFamily: typography.fontBody, fontSize: typography.size.caption, color: colors.textMuted, lineHeight: 18 }}>
              <Text style={{ fontFamily: typography.fontBodyMedium, color: colors.accent }} onPress={() => navigation.navigate('Terms')}>Kullanım Koşulları</Text>
              {' ve '}
              <Text style={{ fontFamily: typography.fontBodyMedium, color: colors.accent }} onPress={() => navigation.navigate('PrivacyPolicy')}>Gizlilik Politikası</Text>
              {'’nı okudum ve kabul ediyorum.'}
            </Text>
          </View>

          <View style={{ marginTop: spacing.sm }}>
            <GradientButton label="Hesap oluştur" onPress={handleRegister} loading={loading} disabled={!gecerli} />
          </View>

          <Pressable onPress={() => navigation.navigate('Login')} style={{ marginTop: spacing.xl, alignSelf: 'center' }} hitSlop={8}>
            <Text style={{ fontFamily: typography.fontBody, fontSize: typography.size.footnote, color: colors.textMuted }}>
              Zaten hesabın var mı? <Text style={{ fontFamily: typography.fontBodyMedium, color: colors.accent }}>Giriş yap</Text>
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
