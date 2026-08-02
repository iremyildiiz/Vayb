// SettingsScreen — sade ana ayarlar: gizlilik, hesap ve yasal bilgiler.

import { useEffect, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  Switch,
  Text,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../components/Screen';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { updateUserProfile } from '../services/users';

export default function SettingsScreen({ navigation }) {
  const { theme } = useTheme();
  const { colors, typography, spacing, radius } = theme;
  const { user, profile, refreshProfile } = useAuth();

  const [mode, setMode] = useState('main'); // main | privacy
  const [isPrivate, setIsPrivate] = useState(profile?.isPrivate ?? false);
  const [savingPrivacy, setSavingPrivacy] = useState(false);

  useEffect(() => {
    setIsPrivate(profile?.isPrivate ?? false);
  }, [profile?.isPrivate]);

  const togglePrivacy = async (value) => {
    if (savingPrivacy) return;
    setIsPrivate(value);
    setSavingPrivacy(true);
    try {
      await updateUserProfile(user.uid, { isPrivate: value });
      await refreshProfile();
    } catch (e) {
      setIsPrivate(!value);
      Alert.alert('Kaydedilemedi', 'Gizlilik ayarı değiştirilemedi.');
    } finally {
      setSavingPrivacy(false);
    }
  };

  const RowIcon = ({ name }) => <Ionicons name={name} size={20} color={colors.textMuted} />;
  const title = mode === 'privacy' ? 'Hesap gizliliği' : 'Ayarlar';
  const goBack = () => {
    if (mode !== 'main') {
      setMode('main');
      return;
    }
    navigation.goBack();
  };

  const MenuRow = ({ icon, label, value, onPress, danger }) => (
    <Pressable onPress={onPress} style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md, opacity: pressed ? 0.6 : 1 })}>
      <Ionicons name={icon} size={20} color={danger ? colors.accent : colors.textMuted} />
      <Text style={{ flex: 1, marginLeft: spacing.md, fontFamily: typography.fontBodyMedium, fontSize: typography.size.body, color: danger ? colors.accent : colors.textPrimary }}>
        {label}
      </Text>
      {value ? (
        <Text numberOfLines={1} style={{ maxWidth: 110, fontFamily: typography.fontBody, fontSize: typography.size.caption, color: colors.textMuted, marginRight: spacing.xs }}>
          {value}
        </Text>
      ) : null}
      {!danger ? <Ionicons name="chevron-forward" size={18} color={colors.textMuted} /> : null}
    </Pressable>
  );

  return (
    <Screen padded={false}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingBottom: spacing.md }}>
        <Pressable onPress={goBack} hitSlop={8}>
          <Ionicons name="chevron-back" size={26} color={colors.textPrimary} />
        </Pressable>
        <Text style={{ flex: 1, textAlign: 'center', fontFamily: typography.fontDisplayMedium, fontSize: typography.size.body, color: colors.textPrimary }}>
          {title}
        </Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView contentContainerStyle={{ paddingHorizontal: spacing.xl, paddingBottom: spacing.xxl }} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          {mode === 'main' ? (
            <>
              <View style={{ marginTop: spacing.sm, marginBottom: spacing.xl }}>
                <Text style={{ fontFamily: typography.fontDisplay, fontSize: typography.size.title, color: colors.textPrimary }}>
                  {profile?.username || profile?.displayName || 'Hesabın'}
                </Text>
                <Text style={{ fontFamily: typography.fontBody, fontSize: typography.size.footnote, color: colors.textMuted, marginTop: spacing.xs }}>
                  Görünürlük ve güvenlik
                </Text>
              </View>

              <View style={{ borderWidth: 1, borderColor: colors.border, borderRadius: radius.card, paddingHorizontal: spacing.lg, paddingVertical: spacing.xs, marginBottom: spacing.xl }}>
                <MenuRow icon="person-circle-outline" label="Hesap ayarları" onPress={() => navigation.navigate('AccountSettings')} />
                <View style={{ height: 1, backgroundColor: colors.border }} />
                <MenuRow icon={isPrivate ? 'lock-closed-outline' : 'earth-outline'} label="Hesap gizliliği" value={isPrivate ? 'Gizli' : 'Açık'} onPress={() => setMode('privacy')} />
              </View>

              <View style={{ borderWidth: 1, borderColor: colors.border, borderRadius: radius.card, paddingHorizontal: spacing.lg, paddingVertical: spacing.xs, marginBottom: spacing.xl }}>
                <MenuRow icon="shield-checkmark-outline" label="Gizlilik Politikası" onPress={() => navigation.navigate('PrivacyPolicy')} />
                <View style={{ height: 1, backgroundColor: colors.border }} />
                <MenuRow icon="document-text-outline" label="Kullanım Koşulları" onPress={() => navigation.navigate('Terms')} />
              </View>
            </>
          ) : null}

          {mode === 'privacy' ? (
            <View style={{ borderWidth: 1, borderColor: colors.border, borderRadius: radius.card, paddingHorizontal: spacing.lg, paddingVertical: spacing.md, marginTop: spacing.sm }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <RowIcon name={isPrivate ? 'lock-closed-outline' : 'earth-outline'} />
                <Text style={{ flex: 1, fontFamily: typography.fontBodyMedium, fontSize: typography.size.body, color: colors.textPrimary, marginLeft: spacing.sm }}>
                  Hesabım gizli olsun
                </Text>
                <Switch
                  value={isPrivate}
                  onValueChange={togglePrivacy}
                  disabled={savingPrivacy}
                  trackColor={{ true: colors.orange, false: colors.border }}
                  thumbColor="#FFFFFF"
                  ios_backgroundColor={colors.border}
                />
              </View>
              <Text style={{ fontFamily: typography.fontBody, fontSize: typography.size.caption, color: colors.textMuted, marginTop: spacing.xs, lineHeight: 17 }}>
                {isPrivate ? 'Karelerin yalnızca onayladığın takipçilerine görünür.' : 'Karelerin açık hesaplarda Vaybla’da görünebilir.'}
              </Text>
            </View>
          ) : null}
      </ScrollView>
    </Screen>
  );
}
