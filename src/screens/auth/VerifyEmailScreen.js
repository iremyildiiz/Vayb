// VerifyEmailScreen — e-posta doğrulama kapısı.
// Doğrulanmamış kullanıcı ana uygulamaya giremez. E-posta adresi GÖSTERİLMEZ.

import { useState, useEffect, useRef } from 'react';
import { View, Text, Pressable, Modal, KeyboardAvoidingView, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../../components/Screen';
import GradientButton from '../../components/GradientButton';
import TextField from '../../components/TextField';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';

const RESEND_SECONDS = 60;

export default function VerifyEmailScreen() {
  const { theme } = useTheme();
  const { colors, typography, spacing, radius, gradients } = theme;
  const { reloadUser, resendVerification, changeUnverifiedEmail, signOut } = useAuth();

  const [checking, setChecking] = useState(false);
  const [sending, setSending] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const [info, setInfo] = useState('');
  const [emailChangeOpen, setEmailChangeOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [changingEmail, setChangingEmail] = useState(false);
  const timer = useRef(null);

  useEffect(() => () => { if (timer.current) clearInterval(timer.current); }, []);

  const startCooldown = () => {
    setCooldown(RESEND_SECONDS);
    if (timer.current) clearInterval(timer.current);
    timer.current = setInterval(() => {
      setCooldown((c) => {
        if (c <= 1) { clearInterval(timer.current); timer.current = null; return 0; }
        return c - 1;
      });
    }, 1000);
  };

  const onCheck = async () => {
    if (checking) return;
    setChecking(true);
    setInfo('');
    const verified = await reloadUser(); // doğrulanmışsa RootNavigator otomatik Main'e geçer
    if (!verified) setInfo('Henüz doğrulanmadı. E-postandaki bağlantıya tıkladığından emin ol.');
    setChecking(false);
  };

  const onResend = async () => {
    if (sending || cooldown > 0) return;
    setSending(true);
    setInfo('');
    try {
      await resendVerification();
      setInfo('Doğrulama e-postası tekrar gönderildi.');
      startCooldown();
    } catch (e) {
      setInfo(e?.code === 'auth/too-many-requests' ? 'Çok fazla deneme. Biraz sonra tekrar dene.' : 'Gönderilemedi, tekrar dene.');
    } finally {
      setSending(false);
    }
  };

  const onChangeEmail = async () => {
    if (!currentPassword || !newEmail.trim() || changingEmail) return;
    setChangingEmail(true);
    try {
      await changeUnverifiedEmail({ currentPassword, newEmail });
      setCurrentPassword('');
      setNewEmail('');
      setEmailChangeOpen(false);
      setInfo('Yeni e-posta adresine doğrulama bağlantısı gönderildi.');
    } catch (e) {
      const message = e?.code === 'auth/invalid-credential'
        ? 'Mevcut şifre hatalı.'
        : e?.code === 'auth/email-already-in-use'
          ? 'Bu e-posta başka bir hesapta kullanılıyor.'
          : 'E-posta değiştirilemedi. Bilgilerini kontrol edip tekrar dene.';
      setInfo(message);
    } finally {
      setChangingEmail(false);
    }
  };

  return (
    <Screen style={{ justifyContent: 'space-between' }}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <LinearGradient colors={gradients.sunset} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ width: 84, height: 84, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center', marginBottom: spacing.xl }}>
          <Ionicons name="mail-unread-outline" size={40} color="#FFFFFF" />
        </LinearGradient>

        <Text style={{ fontFamily: typography.fontDisplay, fontSize: typography.size.display, color: colors.textPrimary }}>
          E-postanı doğrula
        </Text>
        <Text style={{ fontFamily: typography.fontBody, fontSize: typography.size.footnote, color: colors.textMuted, textAlign: 'center', marginTop: spacing.md, maxWidth: 300, lineHeight: 22 }}>
          Kayıt olurken verdiğin e-posta adresine bir doğrulama bağlantısı gönderdik. Bağlantıya tıkladıktan sonra “Doğruladım” butonuna bas.
        </Text>

        {info ? (
          <Text style={{ fontFamily: typography.fontBody, fontSize: typography.size.footnote, color: colors.accent, textAlign: 'center', marginTop: spacing.lg, maxWidth: 300 }}>
            {info}
          </Text>
        ) : null}
      </View>

      <View style={{ gap: spacing.md }}>
        <GradientButton label={checking ? 'Kontrol ediliyor…' : 'Doğruladım, kontrol et'} onPress={onCheck} loading={checking} />
        <GradientButton
          label={cooldown > 0 ? `Yeniden gönder (${cooldown}s)` : 'Doğrulama e-postasını yeniden gönder'}
          variant="ghost"
          onPress={onResend}
          loading={sending}
          disabled={cooldown > 0}
        />
        <Pressable onPress={signOut} style={{ alignSelf: 'center', paddingVertical: spacing.sm }} hitSlop={8}>
          <Text style={{ fontFamily: typography.fontBodyMedium, fontSize: typography.size.footnote, color: colors.textMuted }}>
            Çıkış yap
          </Text>
        </Pressable>
        <Pressable onPress={() => setEmailChangeOpen(true)} style={{ alignSelf: 'center', paddingVertical: spacing.xs }} hitSlop={8}>
          <Text style={{ fontFamily: typography.fontBodyMedium, fontSize: typography.size.footnote, color: colors.accent }}>
            E-postana erişemiyor musun?
          </Text>
        </Pressable>
      </View>

      <Modal visible={emailChangeOpen} transparent animationType="slide" onRequestClose={() => setEmailChangeOpen(false)}>
        <KeyboardAvoidingView style={{ flex: 1, justifyContent: 'flex-end' }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <Pressable onPress={() => setEmailChangeOpen(false)} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' }} />
          <View style={{ backgroundColor: colors.bg, borderTopLeftRadius: radius.card, borderTopRightRadius: radius.card, padding: spacing.xl }}>
            <View style={{ width: 38, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginBottom: spacing.lg }} />
            <Text style={{ fontFamily: typography.fontDisplay, fontSize: typography.size.title, color: colors.textPrimary, marginBottom: spacing.sm }}>E-postanı değiştir</Text>
            <Text style={{ fontFamily: typography.fontBody, fontSize: typography.size.footnote, color: colors.textMuted, lineHeight: 20, marginBottom: spacing.lg }}>Yeni adresine doğrulama bağlantısı göndereceğiz. Güvenliğin için mevcut şifren gerekli.</Text>
            <TextField label="Mevcut şifre" value={currentPassword} onChangeText={setCurrentPassword} placeholder="••••••" secureTextEntry autoComplete="password" icon="lock-closed-outline" />
            <TextField label="Yeni e-posta" value={newEmail} onChangeText={setNewEmail} placeholder="ornek@mail.com" keyboardType="email-address" autoComplete="email" icon="mail-outline" />
            <GradientButton label="Doğrulama bağlantısı gönder" onPress={onChangeEmail} loading={changingEmail} disabled={!currentPassword || !newEmail.trim()} />
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </Screen>
  );
}
