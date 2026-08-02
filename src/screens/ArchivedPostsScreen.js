// ArchivedPostsScreen — kullanıcının arşivlediği anlar. Sahibi silmeden gizlediği
// kareler burada durur; anıya dokunup detayında "Profilime geri koy" ile geri alınır.

import { useCallback, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  Pressable,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../components/Screen';
import MasonryGrid from '../components/MasonryGrid';
import { useTheme } from '../context/ThemeContext';
import { getArchivedPosts } from '../services/posts';

export default function ArchivedPostsScreen({ navigation }) {
  const { theme } = useTheme();
  const { colors, typography, spacing } = theme;
  const { width: screenW } = useWindowDimensions();

  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const sidePad = spacing.lg;
  const gap = spacing.md;
  const columnWidth = (screenW - sidePad * 2 - gap) / 2;
  const openPost = useCallback((post) => navigation.navigate('PostDetail', { post }), [navigation]);

  const load = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      setPosts(await getArchivedPosts());
    } catch (e) {
      console.warn('[archived] arşiv yüklenemedi:', e?.code || e?.message);
      setPosts([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <Screen padded={false}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingBottom: spacing.md }}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={8}>
          <Ionicons name="chevron-back" size={26} color={colors.textPrimary} />
        </Pressable>
        <Text style={{ flex: 1, textAlign: 'center', fontFamily: typography.fontDisplayMedium, fontSize: typography.size.body, color: colors.textPrimary }}>
          Arşivim
        </Text>
        <View style={{ width: 26 }} />
      </View>

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: sidePad, paddingBottom: spacing.xxl, flexGrow: 1 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} tintColor={colors.accent} colors={[colors.accent]} />}
          showsVerticalScrollIndicator={false}
        >
          {posts.length ? (
            <MasonryGrid posts={posts} columnWidth={columnWidth} gap={gap} onPressPost={openPost} />
          ) : (
            <View style={{ alignItems: 'center', paddingTop: spacing.xxl * 2 }}>
              <Ionicons name="archive-outline" size={48} color={colors.textMuted} />
              <Text style={{ fontFamily: typography.fontDisplay, fontSize: typography.size.title, color: colors.textPrimary, marginTop: spacing.md }}>
                Arşivin boş
              </Text>
              <Text style={{ fontFamily: typography.fontBody, fontSize: typography.size.footnote, color: colors.textMuted, textAlign: 'center', marginTop: spacing.xs, maxWidth: 260, lineHeight: 20 }}>
                Silmek istemediğin ama profilinde durmasını istemediğin anları arşivle; buradan istediğinde geri alırsın.
              </Text>
            </View>
          )}
        </ScrollView>
      )}
    </Screen>
  );
}
