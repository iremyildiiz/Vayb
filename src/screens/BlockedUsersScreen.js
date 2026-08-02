// BlockedUsersScreen — engellediğim kullanıcılar + engeli kaldır (Faz 7B UGC).

import { useState, useCallback } from 'react';
import { View, Text, Image, Pressable, FlatList, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../components/Screen';
import { useTheme } from '../context/ThemeContext';
import { getBlockedUids, unblockUser } from '../services/moderation';
import { getUserProfile } from '../services/users';

export default function BlockedUsersScreen({ navigation }) {
  const { theme } = useTheme();
  const { colors, typography, spacing, radius, gradients } = theme;

  const [items, setItems] = useState([]); // { uid, profile }
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(null); // işlenen uid

  const load = useCallback(async () => {
    try {
      const uids = await getBlockedUids();
      const withProfiles = await Promise.all(
        uids.map(async (uid) => ({ uid, profile: await getUserProfile(uid).catch(() => null) })),
      );
      setItems(withProfiles);
    } catch (e) {
      /* sessiz geç */
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onUnblock = async (uid) => {
    setBusy(uid);
    try {
      await unblockUser(uid);
      setItems((prev) => prev.filter((it) => it.uid !== uid));
    } catch (e) {
      /* sessiz geç */
    } finally {
      setBusy(null);
    }
  };

  const renderItem = ({ item }) => {
    const p = item.profile || {};
    const uname = p.username ? '@' + p.username : p.displayName || 'vayb kullanıcısı';
    const initial = (p.username || p.displayName || '?').trim().charAt(0).toUpperCase() || '?';
    const isBusy = busy === item.uid;
    return (
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md }}>
        <Pressable onPress={() => navigation.navigate('UserProfile', { uid: item.uid })}>
          {p.photoURL ? (
            <Image source={{ uri: p.photoURL }} style={{ width: 44, height: 44, borderRadius: radius.pill }} />
          ) : (
            <LinearGradient colors={gradients.sunset} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ width: 44, height: 44, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontFamily: typography.fontDisplay, fontSize: typography.size.body, color: '#FFFFFF' }}>{initial}</Text>
            </LinearGradient>
          )}
        </Pressable>

        <Pressable style={{ flex: 1, marginHorizontal: spacing.md }} onPress={() => navigation.navigate('UserProfile', { uid: item.uid })}>
          <Text numberOfLines={1} style={{ fontFamily: typography.fontBodyMedium, fontSize: typography.size.body, color: colors.textPrimary }}>
            {uname}
          </Text>
          {p.displayName && p.username ? (
            <Text numberOfLines={1} style={{ fontFamily: typography.fontBody, fontSize: typography.size.caption, color: colors.textMuted }}>
              {p.displayName}
            </Text>
          ) : null}
        </Pressable>

        {isBusy ? (
          <ActivityIndicator color={colors.accent} />
        ) : (
          <Pressable
            onPress={() => onUnblock(item.uid)}
            hitSlop={6}
            style={({ pressed }) => ({ paddingVertical: spacing.xs + 2, paddingHorizontal: spacing.md, borderRadius: radius.button, borderWidth: 1, borderColor: colors.border, opacity: pressed ? 0.6 : 1 })}
          >
            <Text style={{ fontFamily: typography.fontBodyMedium, fontSize: typography.size.footnote, color: colors.textPrimary }}>
              Engeli kaldır
            </Text>
          </Pressable>
        )}
      </View>
    );
  };

  return (
    <Screen padded={false}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingBottom: spacing.md }}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={8}>
          <Ionicons name="chevron-back" size={26} color={colors.textPrimary} />
        </Pressable>
        <Text style={{ flex: 1, textAlign: 'center', fontFamily: typography.fontDisplayMedium, fontSize: typography.size.body, color: colors.textPrimary }}>
          Engellediklerim
        </Text>
        <View style={{ width: 26 }} />
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(it) => it.uid}
          renderItem={renderItem}
          contentContainerStyle={{ paddingHorizontal: spacing.xl, flexGrow: 1 }}
          ListEmptyComponent={
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: spacing.xxl * 2 }}>
              <Ionicons name="ban-outline" size={44} color={colors.textMuted} />
              <Text style={{ fontFamily: typography.fontBody, fontSize: typography.size.footnote, color: colors.textMuted, marginTop: spacing.sm }}>
                Kimseyi engellemedin.
              </Text>
            </View>
          }
        />
      )}
    </Screen>
  );
}
