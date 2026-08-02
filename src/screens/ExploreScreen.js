// ExploreScreen — Keşfet (Faz 6.5)
// Pinterest tarzı masonry, YALNIZCA açık (isPrivate=false) hesapların postları.
// Vayb felsefesi: "önce güzel şeye aç" — sakin, görsel-öncelikli.

import { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, ActivityIndicator, RefreshControl, useWindowDimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../components/Screen';
import AppTopBar from '../components/AppTopBar';
import MasonryGrid from '../components/MasonryGrid';
import { useTheme } from '../context/ThemeContext';
import { getExplorePosts } from '../services/feed';

const PAGE = 20;

export default function ExploreScreen({ navigation }) {
  const { theme } = useTheme();
  const { colors, typography, spacing } = theme;
  const { width: screenW } = useWindowDimensions();

  const [posts, setPosts] = useState([]);
  const [lastDoc, setLastDoc] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const sidePad = spacing.lg;
  const gap = spacing.md;
  const columnWidth = (screenW - sidePad * 2 - gap) / 2;

  const loadFirst = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    try {
      const { posts: p, lastDoc: ld } = await getExplorePosts(PAGE);
      setPosts(p);
      setLastDoc(ld);
      setHasMore(!!ld);
    } catch (e) {
      console.warn('[explore] yüklenemedi:', e?.code || e?.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  const loadMore = useCallback(async () => {
    if (loadingMore || refreshing || loading || !hasMore || !lastDoc) return;
    setLoadingMore(true);
    try {
      const { posts: p, lastDoc: ld } = await getExplorePosts(PAGE, lastDoc);
      setPosts((prev) => [...prev, ...p]);
      setLastDoc(ld);
      setHasMore(!!ld);
    } catch (e) {
      console.warn('[explore] sayfa yüklenemedi:', e?.code || e?.message);
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, refreshing, loading, hasMore, lastDoc]);

  useEffect(() => { loadFirst(); }, [loadFirst]);

  const onScroll = ({ nativeEvent }) => {
    const { layoutMeasurement, contentOffset, contentSize } = nativeEvent;
    if (layoutMeasurement.height + contentOffset.y >= contentSize.height - 400) loadMore();
  };

  const goPost = useCallback((post) => navigation.navigate('PostDetail', { post }), [navigation]);

  return (
    <Screen padded={false}>
      <AppTopBar navigation={navigation} title="Vaybla" showNotifications={false} />

      {loading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingHorizontal: sidePad, paddingBottom: spacing.xxl, flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
          onScroll={onScroll}
          scrollEventThrottle={200}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadFirst(true)} tintColor={colors.accent} colors={[colors.accent]} />}
        >
          {posts.length ? (
            <MasonryGrid posts={posts} columnWidth={columnWidth} gap={gap} onPressPost={goPost} />
          ) : (
            <View style={{ alignItems: 'center', paddingTop: spacing.xxl * 2 }}>
              <Ionicons name="compass-outline" size={48} color={colors.textMuted} />
              <Text style={{ fontFamily: typography.fontDisplay, fontSize: typography.size.title, color: colors.textPrimary, marginTop: spacing.md }}>
                Keşfedecek bir şey yok
              </Text>
              <Text style={{ fontFamily: typography.fontBody, fontSize: typography.size.footnote, color: colors.textMuted, textAlign: 'center', marginTop: spacing.xs, maxWidth: 260, lineHeight: 20 }}>
                Açık hesaplar an paylaştıkça burası dolacak.
              </Text>
            </View>
          )}
          {loadingMore ? <View style={{ paddingVertical: spacing.lg }}><ActivityIndicator color={colors.accent} /></View> : null}
        </ScrollView>
      )}
    </Screen>
  );
}
