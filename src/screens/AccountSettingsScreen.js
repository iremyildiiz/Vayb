// AccountSettingsScreen — hassas hesap işlemleri ana Ayarlar'dan ayrı tutulur.

import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../components/Screen';
import TextField from '../components/TextField';
import GradientButton from '../components/GradientButton';
import { useTheme } from '../context/ThemeContext';
import { changeCurrentUserPassword, deleteCurrentUserAccount } from '../services/users';

export default function AccountSettingsScreen({ navigation }) {
  const { theme } = useTheme();
  const { colors, typography, spacing, radius } = theme;
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [deletePassword, setDeletePassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const doChangePassword = async () => {
    setChangingPassword(true);
    try {
      await changeCurrentUserPassword(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setPasswordOpen(false);
      Alert.alert('Şifre değişti', 'Yeni şifren artık aktif.');
    } catch (e) {
      Alert.alert('Şifre değişmedi', e?.code === 'auth/invalid-credential' ? 'Güncel şifre hatalı.' : e?.message || 'Tekrar dene.');
    } finally {
      setChangingPassword(false);
    }
  };

  const handleChangePassword = () => {
    if (!currentPassword || newPassword.length < 6 || changingPassword) return;
    if (newPassword === currentPassword) {
      Alert.alert('Şifre değişmedi', 'Yeni şifre eskisiyle aynı olamaz.');
      return;
    }
    Alert.alert(
      'Şifre değiştirilsin mi?',
      'Hesabının şifresi güncellenecek. Sonraki girişlerinde yeni şifreni kullanacaksın.',
      [
        { text: 'Vazgeç', style: 'cancel' },
        { text: 'Değiştir', style: 'destructive', onPress: doChangePassword },
      ],
    );
  };

  const handleDelete = async () => {
    if (!deletePassword || deleting) return;
    setDeleting(true);
    try {
      await deleteCurrentUserAccount(deletePassword);
    } catch (e) {
      setDeleting(false);
      Alert.alert('Silinemedi', e?.code === 'auth/invalid-credential' ? 'Güncel şifre hatalı.' : e?.message || 'Tekrar dene.');
    }
  };

  const closeDelete = () => {
    if (deleting) return;
    setDeletePassword('');
    setDeleteOpen(false);
  };

  const Row = ({ icon, label, detail, onPress, muted }) => (
    <Pressable onPress={onPress} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.lg, opacity: pressed ? 0.62 : 1 })}>
      <Ionicons name={icon} size={20} color={muted ? colors.textMuted : colors.textPrimary} />
      <View style={{ flex: 1, marginLeft: spacing.md }}>
        <Text style={{ fontFamily: typography.fontBodyMedium, fontSize: typography.size.body, color: colors.textPrimary }}>{label}</Text>
        {detail ? <Text style={{ fontFamily: typography.fontBody, fontSize: typography.size.caption, color: colors.textMuted, marginTop: 3 }}>{detail}</Text> : null}
      </View>
      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
    </Pressable>
  );

  return (
    <Screen padded={false}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingBottom: spacing.md }}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={8}>
          <Ionicons name="chevron-back" size={26} color={colors.textPrimary} />
        </Pressable>
        <Text style={{ flex: 1, textAlign: 'center', fontFamily: typography.fontDisplayMedium, fontSize: typography.size.body, color: colors.textPrimary }}>Hesap ayarları</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: spacing.xl, paddingBottom: spacing.xxl }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        <Text style={{ fontFamily: typography.fontDisplay, fontSize: typography.size.title, color: colors.textPrimary, marginTop: spacing.sm }}>Hesabın</Text>
        <Text style={{ fontFamily: typography.fontBody, fontSize: typography.size.footnote, color: colors.textMuted, marginTop: spacing.xs, marginBottom: spacing.xl }}>Güvenlik ve hesap işlemleri</Text>

        <View style={{ borderWidth: 1, borderColor: colors.border, borderRadius: radius.card, paddingHorizontal: spacing.lg }}>
          <Row icon="key-outline" label="Şifre değiştir" detail="Güncel şifrenle yeni şifre belirle" onPress={() => setPasswordOpen(true)} />
          <View style={{ height: 1, backgroundColor: colors.border }} />
          <Row icon="trash-outline" label="Hesabı sil" detail="Bu işlem geri alınamaz" onPress={() => setDeleteOpen(true)} muted />
        </View>
      </ScrollView>

      <Modal visible={passwordOpen} transparent animationType="slide" onRequestClose={() => setPasswordOpen(false)}>
        <KeyboardAvoidingView style={{ flex: 1, justifyContent: 'flex-end' }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <Pressable onPress={() => setPasswordOpen(false)} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' }} />
          <View style={{ backgroundColor: colors.bg, borderTopLeftRadius: radius.card, borderTopRightRadius: radius.card, padding: spacing.xl }}>
            <View style={{ width: 38, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginBottom: spacing.lg }} />
            <Text style={{ fontFamily: typography.fontDisplay, fontSize: typography.size.title, color: colors.textPrimary, marginBottom: spacing.lg }}>Şifre değiştir</Text>
            <TextField label="Güncel şifre" value={currentPassword} onChangeText={setCurrentPassword} placeholder="••••••" secureTextEntry autoComplete="password" icon="lock-closed-outline" />
            <TextField label="Yeni şifre" value={newPassword} onChangeText={setNewPassword} placeholder="En az 6 karakter" secureTextEntry autoComplete="password-new" icon="sparkles-outline" />
            <GradientButton label="Şifreyi güncelle" onPress={handleChangePassword} loading={changingPassword} disabled={!currentPassword || newPassword.length < 6} />
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <Modal visible={deleteOpen} transparent animationType="slide" onRequestClose={closeDelete}>
        <KeyboardAvoidingView style={{ flex: 1, justifyContent: 'flex-end' }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <Pressable onPress={closeDelete} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.35)' }} />
          <View style={{ backgroundColor: colors.bg, borderTopLeftRadius: radius.card, borderTopRightRadius: radius.card, padding: spacing.xl }}>
            <View style={{ width: 38, height: 4, borderRadius: 2, backgroundColor: colors.border, alignSelf: 'center', marginBottom: spacing.lg }} />
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.sm }}>
              <Ionicons name="trash-outline" size={21} color={colors.textMuted} />
              <Text style={{ fontFamily: typography.fontDisplay, fontSize: typography.size.title, color: colors.textPrimary, marginLeft: spacing.sm }}>Hesabı sil</Text>
            </View>
            <Text style={{ fontFamily: typography.fontBody, fontSize: typography.size.footnote, color: colors.textMuted, lineHeight: 20, marginBottom: spacing.lg }}>Bu işlem hesabını, karelerini ve kayıtlarını kalıcı olarak siler. Devam etmek için mevcut şifreni gir.</Text>
            <TextField label="Mevcut şifre" value={deletePassword} onChangeText={setDeletePassword} placeholder="••••••" secureTextEntry autoComplete="password" icon="lock-closed-outline" />
            <GradientButton label="Hesabı kalıcı olarak sil" onPress={handleDelete} loading={deleting} disabled={!deletePassword} />
            <Pressable onPress={closeDelete} disabled={deleting} style={({ pressed }) => ({ alignItems: 'center', paddingVertical: spacing.md, opacity: pressed || deleting ? 0.55 : 1 })}>
              <Text style={{ fontFamily: typography.fontBodyMedium, fontSize: typography.size.body, color: colors.textMuted }}>Vazgeç</Text>
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </Screen>
  );
}
