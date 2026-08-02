// LocationPostsScreen — bir mekândaki tüm gönderiler (Instagram tarzı konum sayfası).
// PostCard/PostDetail'de konuma basınca açılır; route.params: { name, key }.

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
import { getPostsByLocationKey } from '../services/posts';
import { shortPlace, locationKey } from '../utils/location';

export default function LocationPostsScreen({ navigation, route }) {
  const { theme } = useTheme();
  const { colors, typography, spacing } = theme;
  const { width: screenW } = useWindowDimensions();

  const name = shortPlace(route?.params?.name || '');
  const key = route?.params?.key || locationKey(name);

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
      setPosts(await getPostsByLocationKey(key));
    } catch (e) {
      console.warn('[location] gönderiler yüklenemedi:', e?.code || e?.message);
      setPosts([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [key]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  return (
    <Screen padded={false}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingBottom: spacing.md }}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={8}>
          <Ionicons name="chevron-back" size={26} color={colors.textPrimary} />
        </Pressable>
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginHorizontal: spacing.sm }}>
          <Ionicons name="location" size={16} color={colors.accent} />
          <Text numberOfLines={1} style={{ marginLeft: 4, fontFamily: typography.fontDisplayMedium, fontSize: typography.size.body, color: colors.textPrimary }}>
            {name || 'Konum'}
          </Text>
        </View>
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
              <Ionicons name="location-outline" size={48} color={colors.textMuted} />
              <Text style={{ fontFamily: typography.fontDisplay, fontSize: typography.size.title, color: colors.textPrimary, marginTop: spacing.md }}>
                Bu konumda an yok
              </Text>
              <Text style={{ fontFamily: typography.fontBody, fontSize: typography.size.footnote, color: colors.textMuted, textAlign: 'center', marginTop: spacing.xs, maxWidth: 260, lineHeight: 20 }}>
                Buraya ilk kareyi sen bırakabilirsin.
              </Text>
            </View>
          )}
        </ScrollView>
      )}
    </Screen>
  );
}
