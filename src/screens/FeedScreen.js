// FeedScreen — Ana akış (Faz 4 + 6.5)
// Takip ettiklerimin postları (kronolojik). Hiç takip etmiyorsam "önerilen"
// (açık hesaplardan seçki) gösterir ki akış boş kalmasın.

import { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, Pressable, FlatList, ActivityIndicator, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import Screen from '../components/Screen';
import AppTopBar from '../components/AppTopBar';
import PostCard from '../components/PostCard';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { getFeedPosts, getExplorePosts } from '../services/feed';
import { getFollowingUids } from '../services/follows';
import { getUnreadConversationCount } from '../services/chats';

const PAGE = 10;

export default function FeedScreen({ navigation }) {
  const { theme } = useTheme();
  const { colors, typography, spacing } = theme;
  const { user } = useAuth();

  const [posts, setPosts] = useState([]);
  const [lastDoc, setLastDoc] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [mode, setMode] = useState('following'); // 'following' | 'suggested'
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(false);
  const [unreadChats, setUnreadChats] = useState(0);

  const followingRef = useRef([]);

  const loadFirst = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(false);
    try {
      const following = await getFollowingUids(user.uid);
      followingRef.current = following;
      if (following.length) {
        setMode('following');
        const { posts: p, lastDoc: ld } = await getFeedPosts({ followingUids: following, pageSize: PAGE });
        setPosts(p);
        setLastDoc(ld);
        setHasMore(p.length === PAGE);
      } else {
        setMode('suggested');
        const { posts: p, lastDoc: ld } = await getExplorePosts(PAGE);
        setPosts(p);
        setLastDoc(ld);
        setHasMore(!!ld);
      }
    } catch (e) {
      console.warn('[feed] yüklenemedi:', e?.code || e?.message);
      setError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user.uid]);

  const loadMore = useCallback(async () => {
    if (loadingMore || refreshing || loading || !hasMore || !lastDoc) return;
    setLoadingMore(true);
    try {
      if (mode === 'following') {
        const { posts: p, lastDoc: ld } = await getFeedPosts({ followingUids: followingRef.current, pageSize: PAGE, lastDoc });
        setPosts((prev) => [...prev, ...p]);
        setLastDoc(ld);
        setHasMore(p.length === PAGE);
      } else {
        const { posts: p, lastDoc: ld } = await getExplorePosts(PAGE, lastDoc);
        setPosts((prev) => [...prev, ...p]);
        setLastDoc(ld);
        setHasMore(!!ld);
      }
    } catch (e) {
      console.warn('[feed] sayfa yüklenemedi:', e?.code || e?.message);
    } finally {
      setLoadingMore(false);
    }
  }, [loadingMore, refreshing, loading, hasMore, lastDoc, mode]);

  useEffect(() => { loadFirst(); }, [loadFirst]);

  useFocusEffect(useCallback(() => {
    let alive = true;
    (async () => {
      try {
        const count = await getUnreadConversationCount(user.uid);
        if (alive) setUnreadChats(count);
      } catch (e) {
        if (alive) setUnreadChats(0);
      }
    })();
    return () => { alive = false; };
  }, [user.uid]));

  if (loading) {
    return (
      <Screen padded={false}>
        <AppTopBar navigation={navigation} showSearch={false} showChat unreadChats={unreadChats} />
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={colors.accent} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen padded={false}>
      <AppTopBar navigation={navigation} showSearch={false} showChat unreadChats={unreadChats} />

      {/* Önerilen modu ipucu */}
      {mode === 'suggested' && posts.length ? (
        <View style={{ paddingHorizontal: spacing.xl, paddingBottom: spacing.md }}>
          <Text style={{ fontFamily: typography.fontBody, fontSize: typography.size.caption, color: colors.textMuted }}>
            Vaybla’da keşfetmeye başla · takip ettiğin arttıkça akışın sana göre şekillenir
          </Text>
        </View>
      ) : (
        <View style={{ paddingBottom: spacing.sm }} />
      )}

      <FlatList
        data={posts}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <PostCard post={item} />}
        contentContainerStyle={{ paddingHorizontal: spacing.lg, paddingBottom: spacing.xxl, flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => loadFirst(true)} tintColor={colors.accent} colors={[colors.accent]} />}
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={loadingMore ? <View style={{ paddingVertical: spacing.lg }}><ActivityIndicator color={colors.accent} /></View> : null}
        ListEmptyComponent={
          <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl, paddingTop: spacing.xxl * 2 }}>
            <Ionicons name={error ? 'cloud-offline-outline' : 'partly-sunny-outline'} size={48} color={colors.textMuted} />
            <Text style={{ fontFamily: typography.fontDisplay, fontSize: typography.size.title, color: colors.textPrimary, marginTop: spacing.md }}>
              {error ? 'Akış yüklenemedi' : mode === 'following' ? 'Takip ettiklerin sessiz' : 'Henüz paylaşım yok'}
            </Text>
            <Text style={{ fontFamily: typography.fontBody, fontSize: typography.size.footnote, color: colors.textMuted, textAlign: 'center', marginTop: spacing.xs, lineHeight: 20, maxWidth: 260 }}>
              {error
                ? 'Bağlantını kontrol edip aşağı çekerek yenile.'
                : mode === 'following'
                ? 'Takip ettiklerin henüz an paylaşmadı. Vaybla’dan yeni kareler bul.'
                : 'İlk kareyi sen bırak — gördüğün güzel bir anı paylaş.'}
            </Text>
            {!error ? (
              <Pressable onPress={() => navigation.navigate('Explore')} style={{ marginTop: spacing.lg }} hitSlop={8}>
                <Text style={{ fontFamily: typography.fontBodyMedium, fontSize: typography.size.footnote, color: colors.accent }}>
                  Vaybla’ya git
                </Text>
              </Pressable>
            ) : null}
          </View>
        }
      />
    </Screen>
  );
}
