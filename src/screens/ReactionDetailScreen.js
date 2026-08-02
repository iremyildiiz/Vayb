// ReactionDetailScreen — bir gönderinin his izlerini tek merkezde gösterir.

import { useCallback, useEffect, useState } from 'react';
import { View, Text, Image, Pressable, ScrollView, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../components/Screen';
import MoodTraceIcon from '../components/MoodTraceIcon';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { getReactionSummary } from '../services/engagement';
import { getUserProfile } from '../services/users';

function displayUser(info) {
  if (!info) return 'vayb kullanıcısı';
  return info.username || info.displayName || 'vayb kullanıcısı';
}

export default function ReactionDetailScreen({ navigation, route }) {
  const { theme } = useTheme();
  const { colors, typography, spacing, radius, gradients } = theme;
  const { user } = useAuth();
  const postId = route?.params?.postId;

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!postId) {
      setRows([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const summary = await getReactionSummary(postId);
      const nextRows = [];
      for (const [reaction, uids] of Object.entries(summary)) {
        for (const uid of uids) {
          let profile = null;
          try { profile = await getUserProfile(uid); } catch (e) {}
          nextRows.push({
            uid,
            reaction,
            username: profile?.username,
            displayName: profile?.displayName,
            photoURL: profile?.photoURL,
          });
        }
      }
      setRows(nextRows);
    } catch (e) {
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [postId]);

  useEffect(() => { load(); }, [load]);

  const goToUser = (uid) => {
    if (uid === user?.uid) navigation.navigate('Main', { screen: 'Profile' });
    else navigation.navigate('UserProfile', { uid });
  };

  return (
    <Screen padded={false}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingBottom: spacing.md }}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={8}>
          <Ionicons name="chevron-back" size={26} color={colors.textPrimary} />
        </Pressable>
        <Text style={{ flex: 1, textAlign: 'center', fontFamily: typography.fontBodyMedium, fontSize: typography.size.body, color: colors.textPrimary }}>
          His İzleri
        </Text>
        <View style={{ width: 26 }} />
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : rows.length ? (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl }}>
          <Text style={{ fontFamily: typography.fontBody, fontSize: typography.size.footnote, color: colors.textMuted, marginBottom: spacing.md }}>
            {rows.length} his izi
          </Text>
          <View style={{ gap: spacing.md }}>
            {rows.map((row) => {
              const initial = displayUser(row).trim().charAt(0).toUpperCase() || '?';
              return (
                <Pressable
                  key={`${row.uid}_${row.reaction}`}
                  onPress={() => goToUser(row.uid)}
                  style={{ flexDirection: 'row', alignItems: 'center' }}
                  hitSlop={6}
                >
                  {row.photoURL ? (
                    <Image source={{ uri: row.photoURL }} style={{ width: 38, height: 38, borderRadius: radius.pill }} />
                  ) : (
                    <LinearGradient colors={gradients.sunset} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ width: 38, height: 38, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' }}>
                      <Text style={{ fontFamily: typography.fontDisplay, fontSize: typography.size.footnote, color: '#FFFFFF' }}>{initial}</Text>
                    </LinearGradient>
                  )}
                  <View style={{ flex: 1, marginLeft: spacing.sm }}>
                    <Text numberOfLines={1} style={{ fontFamily: typography.fontBodyMedium, fontSize: typography.size.footnote, color: colors.textPrimary }}>
                      {displayUser(row)}
                    </Text>
                    <Text style={{ fontFamily: typography.fontBody, fontSize: typography.size.caption, color: colors.textMuted, marginTop: 2 }}>
                      {row.reaction}
                    </Text>
                  </View>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
      ) : (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl }}>
          <MoodTraceIcon size={42} color={colors.textMuted} />
          <Text style={{ fontFamily: typography.fontBody, fontSize: typography.size.footnote, color: colors.textMuted, marginTop: spacing.sm }}>
            Henüz his izi yok.
          </Text>
        </View>
      )}
    </Screen>
  );
}
