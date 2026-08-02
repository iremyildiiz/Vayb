// UserListScreen — takipçi / takip listeleri.

import { useCallback, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, Text, View } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../components/Screen';
import { useTheme } from '../context/ThemeContext';
import { getUserProfile } from '../services/users';
import { getFollowerUids, getFollowingUids } from '../services/follows';

function displayUser(info) {
  if (!info) return 'vayb kullanıcısı';
  return info.username || info.displayName || 'vayb kullanıcısı';
}

export default function UserListScreen({ navigation, route }) {
  const { theme } = useTheme();
  const { colors, typography, spacing, radius, gradients } = theme;
  const uid = route?.params?.uid;
  const type = route?.params?.type || 'followers';
  const title = type === 'following' ? 'Takip' : 'Takipçi';

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!uid) {
      setItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const uids = type === 'following' ? await getFollowingUids(uid) : await getFollowerUids(uid);
      const profiles = await Promise.all(
        uids.map(async (userUid) => {
          let profile = null;
          try { profile = await getUserProfile(userUid); } catch (e) {}
          return profile ? { id: userUid, ...profile } : null;
        }),
      );
      setItems(profiles.filter(Boolean));
    } catch (e) {
      console.warn('[users] liste yüklenemedi:', e?.code || e?.message);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [uid, type]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <Screen padded={false}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingBottom: spacing.md }}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={8}>
          <Ionicons name="chevron-back" size={26} color={colors.textPrimary} />
        </Pressable>
        <Text style={{ flex: 1, textAlign: 'center', fontFamily: typography.fontDisplayMedium, fontSize: typography.size.body, color: colors.textPrimary }}>
          {title}
        </Text>
        <View style={{ width: 26 }} />
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl, flexGrow: 1 }}>
          {items.length ? (
            <View style={{ gap: spacing.md }}>
              {items.map((item) => {
                const initial = displayUser(item).trim().charAt(0).toUpperCase() || '?';
                return (
                  <Pressable
                    key={item.id}
                    onPress={() => navigation.navigate('UserProfile', { uid: item.id })}
                    style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.xs }}
                    hitSlop={6}
                  >
                    {item.photoURL ? (
                      <Image source={{ uri: item.photoURL }} style={{ width: 44, height: 44, borderRadius: radius.pill }} />
                    ) : (
                      <LinearGradient colors={gradients.sunset} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ width: 44, height: 44, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ fontFamily: typography.fontDisplay, fontSize: typography.size.body, color: '#FFFFFF' }}>{initial}</Text>
                      </LinearGradient>
                    )}
                    <View style={{ flex: 1, marginLeft: spacing.md }}>
                      <Text numberOfLines={1} style={{ fontFamily: typography.fontBodyMedium, fontSize: typography.size.body, color: colors.textPrimary }}>
                        {displayUser(item)}
                      </Text>
                      {item.displayName && item.username ? (
                        <Text numberOfLines={1} style={{ fontFamily: typography.fontBody, fontSize: typography.size.caption, color: colors.textMuted, marginTop: 2 }}>
                          {item.displayName}
                        </Text>
                      ) : null}
                    </View>
                  </Pressable>
                );
              })}
            </View>
          ) : (
            <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingBottom: spacing.xxl }}>
              <Ionicons name="people-outline" size={42} color={colors.textMuted} />
              <Text style={{ fontFamily: typography.fontBody, fontSize: typography.size.footnote, color: colors.textMuted, marginTop: spacing.sm }}>
                Henüz kimse yok.
              </Text>
            </View>
          )}
        </ScrollView>
      )}
    </Screen>
  );
}
