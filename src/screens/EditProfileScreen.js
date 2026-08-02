// EditProfileScreen — profil düzenleme (Faz 5)
// isim/username, bio, profil fotoğrafı (galeri → Storage → users/{uid}.photoURL).
// Sade, form-ağır değil; Vayb estetiği.

import { useState } from 'react';
import {
  View,
  Text,
  Image,
  Pressable,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Switch,
  Platform,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import Screen from '../components/Screen';
import TextField from '../components/TextField';
import GradientButton from '../components/GradientButton';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { uploadProfilePhoto, updateUserProfile } from '../services/users';

export default function EditProfileScreen({ navigation }) {
  const { theme } = useTheme();
  const { colors, typography, spacing, radius, gradients } = theme;
  const { user, profile, refreshProfile } = useAuth();

  const [displayName, setDisplayName] = useState(profile?.displayName || '');
  const [username, setUsername] = useState(profile?.username || '');
  const [bio, setBio] = useState(profile?.bio || '');
  const [isPrivate, setIsPrivate] = useState(profile?.isPrivate ?? false);
  const [localPhoto, setLocalPhoto] = useState(null); // yeni seçilen (file://)
  const [saving, setSaving] = useState(false);

  const shownPhoto = localPhoto || profile?.photoURL || null;

  const pickImage = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Galeri izni gerekli', 'Profil fotoğrafı seçebilmek için galerine erişim ver.');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!res.canceled && res.assets?.length) setLocalPhoto(res.assets[0].uri);
  };

  const handleSave = async () => {
    if (saving) return;
    if (displayName.trim().length < 2) {
      Alert.alert('İsim gerekli', 'Lütfen en az 2 karakterlik bir isim gir.');
      return;
    }
    setSaving(true);
    try {
      const data = { displayName, username, bio, isPrivate };
      if (localPhoto) {
        data.photoURL = await uploadProfilePhoto(localPhoto, user.uid);
      }
      await updateUserProfile(user.uid, data);
      await refreshProfile();
      navigation.goBack();
    } catch (e) {
      Alert.alert('Kaydedilemedi', e?.message || 'Bir şeyler ters gitti.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen padded={false}>
      {/* Üst bar */}
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingBottom: spacing.md }}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={8}>
          <Ionicons name="chevron-back" size={26} color={colors.textPrimary} />
        </Pressable>
        <Text style={{ flex: 1, textAlign: 'center', fontFamily: typography.fontDisplayMedium, fontSize: typography.size.body, color: colors.textPrimary }}>
          Profili düzenle
        </Text>
        <View style={{ width: 26 }} />
      </View>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: spacing.xl, paddingBottom: spacing.xl, flexGrow: 1 }}
          keyboardShouldPersistTaps="handled"
        >
          {/* Fotoğraf */}
          <View style={{ alignItems: 'center', marginTop: spacing.md, marginBottom: spacing.xl }}>
            <Pressable onPress={pickImage} style={{ alignItems: 'center' }}>
              {shownPhoto ? (
                <Image source={{ uri: shownPhoto }} style={{ width: 100, height: 100, borderRadius: radius.pill }} />
              ) : (
                <LinearGradient
                  colors={gradients.sunset}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{ width: 100, height: 100, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' }}
                >
                  <Ionicons name="person" size={46} color="#FFFFFF" />
                </LinearGradient>
              )}
              {/* kamera rozeti */}
              <View
                style={{
                  position: 'absolute',
                  bottom: 0,
                  right: 0,
                  width: 32,
                  height: 32,
                  borderRadius: radius.pill,
                  backgroundColor: colors.surface,
                  borderWidth: 1,
                  borderColor: colors.border,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Ionicons name="camera" size={16} color={colors.textPrimary} />
              </View>
            </Pressable>
            <Text style={{ fontFamily: typography.fontBody, fontSize: typography.size.caption, color: colors.textMuted, marginTop: spacing.sm }}>
              Fotoğrafı değiştir
            </Text>
          </View>

          {/* Alanlar */}
          <TextField label="Ad Soyad" value={displayName} onChangeText={setDisplayName} placeholder="Adın" autoCapitalize="words" icon="person-outline" />
          <TextField label="Kullanıcı adı" value={username} onChangeText={setUsername} placeholder="kullaniciadi" icon="at-outline" />

          <Text style={{ fontFamily: typography.fontBodyMedium, fontSize: typography.size.footnote, color: colors.textMuted, marginBottom: spacing.xs }}>
            Bio
          </Text>
          <TextInput
            value={bio}
            onChangeText={setBio}
            placeholder="Kendinden kısaca bahset…"
            placeholderTextColor={colors.textMuted}
            multiline
            maxLength={150}
            style={{
              minHeight: 72,
              backgroundColor: colors.surface,
              borderWidth: 1,
              borderColor: colors.border,
              borderRadius: radius.input,
              padding: spacing.md,
              marginBottom: spacing.xl,
              fontFamily: typography.fontBody,
              fontSize: typography.size.body,
              color: colors.textPrimary,
              textAlignVertical: 'top',
            }}
          />

          {/* Gizlilik */}
          <View style={{ borderWidth: 1, borderColor: colors.border, borderRadius: radius.card, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, marginBottom: spacing.xl }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name={isPrivate ? 'lock-closed-outline' : 'earth-outline'} size={18} color={colors.textMuted} />
              <Text style={{ flex: 1, fontFamily: typography.fontBodyMedium, fontSize: typography.size.body, color: colors.textPrimary, marginLeft: spacing.sm }}>
                Hesabım gizli olsun
              </Text>
              <Switch
                value={isPrivate}
                onValueChange={setIsPrivate}
                trackColor={{ true: colors.orange, false: colors.border }}
                thumbColor="#FFFFFF"
                ios_backgroundColor={colors.border}
              />
            </View>
            <Text style={{ fontFamily: typography.fontBody, fontSize: typography.size.caption, color: colors.textMuted, marginTop: spacing.xs, lineHeight: 17 }}>
              {isPrivate
                ? 'Kişisel günlük gibi — kareler yalnızca onayladığın takipçilerine görünür.'
                : 'Açık galeri gibi — kareler herkese görünür, isteyen takip edebilir.'}
            </Text>
          </View>

          <GradientButton label={saving ? 'Kaydediliyor…' : 'Kaydet'} onPress={handleSave} loading={saving} />
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}
