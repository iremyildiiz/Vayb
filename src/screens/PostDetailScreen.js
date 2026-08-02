// PostDetailScreen — gönderi detay. Fotoğraf büyük, etkileşimler küçük ve sakin.

import { useEffect, useRef, useState, useCallback } from 'react';
import {
  Alert,
  View,
  Text,
  Image,
  Pressable,
  ScrollView,
  ActivityIndicator,
  Animated,
  Modal,
  useWindowDimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../components/Screen';
import PostOptionsSheet from '../components/PostOptionsSheet';
import ModerationSheet from '../components/ModerationSheet';
import { reportPost } from '../services/moderation';
import MoodTraceIcon from '../components/MoodTraceIcon';
import SavedMemoryIcon from '../components/SavedMemoryIcon';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { deletePost, getPost, setPostArchived } from '../services/posts';
import { shortPlace, locationKey } from '../utils/location';
import { getUserProfile } from '../services/users';
import {
  REACTIONS,
  getMyParilti,
  toggleParilti,
  getMyReaction,
  setReaction,
  removeReaction,
  getReactionSummary,
} from '../services/engagement';
import { getMySave, toggleSave } from '../services/saves';

function displayUser(info) {
  if (!info) return 'vayb kullanıcısı';
  return info.username || info.displayName || 'vayb kullanıcısı';
}

export default function PostDetailScreen({ navigation, route }) {
  const { theme } = useTheme();
  const { colors, typography, spacing, radius, gradients, sunset } = theme;
  const { user } = useAuth();
  const { width } = useWindowDimensions();
  const initialPost = route?.params?.post || null;
  const postId = route?.params?.postId || initialPost?.id;

  const [post, setPost] = useState(initialPost);
  const [author, setAuthor] = useState(null);
  const [liked, setLiked] = useState(false);
  const [myReaction, setMyReaction] = useState(null);
  const [reactionCount, setReactionCount] = useState(0);
  const [saved, setSaved] = useState(false);
  const [showChips, setShowChips] = useState(false);
  const [loading, setLoading] = useState(!initialPost);
  const [zoomOpen, setZoomOpen] = useState(false);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [modOpen, setModOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [archiving, setArchiving] = useState(false);

  const scale = useRef(new Animated.Value(1)).current;
  const sparkleScale = useRef(new Animated.Value(0.4)).current;
  const sparkleOpacity = useRef(new Animated.Value(0)).current;
  const lastTap = useRef(0);
  const tapTimer = useRef(null);

  const resolveReactionCount = useCallback(async (id) => {
    const summary = await getReactionSummary(id);
    setReactionCount(Object.values(summary).reduce((total, uids) => total + uids.length, 0));
  }, []);

  const load = useCallback(async () => {
    if (!postId || !user?.uid) return;
    setLoading(true);
    try {
      const fresh = await getPost(postId);
      if (fresh) {
        setPost(fresh);
        setAuthor(await getUserProfile(fresh.authorUid));
      }
      const [lk, mr, sv] = await Promise.all([
        getMyParilti(postId, user.uid),
        getMyReaction(postId, user.uid),
        getMySave(postId, user.uid),
      ]);
      setLiked(lk);
      setMyReaction(mr);
      setSaved(sv);
      await resolveReactionCount(postId);
    } catch (e) {
      /* detay açılamazsa sessiz, boş durum gösterilir */
    } finally {
      setLoading(false);
    }
  }, [postId, user?.uid, resolveReactionCount]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => () => {
    if (tapTimer.current) clearTimeout(tapTimer.current);
  }, []);

  const popAnim = () => {
    Animated.sequence([
      Animated.timing(scale, { toValue: 1.35, duration: 110, useNativeDriver: true }),
      Animated.spring(scale, { toValue: 1, friction: 4, useNativeDriver: true }),
    ]).start();
  };

  const sparkleAnim = () => {
    sparkleScale.setValue(0.35);
    sparkleOpacity.setValue(0);
    Animated.parallel([
      Animated.sequence([
        Animated.timing(sparkleOpacity, { toValue: 1, duration: 90, useNativeDriver: true }),
        Animated.timing(sparkleOpacity, { toValue: 0, duration: 560, useNativeDriver: true }),
      ]),
      Animated.spring(sparkleScale, { toValue: 1.35, friction: 5, tension: 95, useNativeDriver: true }),
    ]).start();
  };

  const goToAuthor = () => {
    if (!post?.authorUid) return;
    if (post.authorUid === user?.uid) navigation.navigate('Main', { screen: 'Profile' });
    else navigation.navigate('UserProfile', { uid: post.authorUid });
  };

  const onParilti = async () => {
    if (!post?.id) return;
    const next = !liked;
    setLiked(next);
    setPost((p) => p ? { ...p, pariltiCount: Math.max(0, (p.pariltiCount || 0) + (next ? 1 : -1)) } : p);
    if (next) popAnim();
    try {
      await toggleParilti(post.id);
    } catch (e) {
      setLiked(!next);
      setPost((p) => p ? { ...p, pariltiCount: Math.max(0, (p.pariltiCount || 0) + (next ? -1 : 1)) } : p);
    }
  };

  const onDoubleTapParilti = async () => {
    if (!post?.id) return;
    sparkleAnim();
    if (liked) return;
    setLiked(true);
    setPost((p) => p ? { ...p, pariltiCount: (p.pariltiCount || 0) + 1 } : p);
    popAnim();
    try {
      await toggleParilti(post.id);
    } catch (e) {
      setLiked(false);
      setPost((p) => p ? { ...p, pariltiCount: Math.max(0, (p.pariltiCount || 0) - 1) } : p);
    }
  };

  const onPhotoPress = () => {
    const now = Date.now();
    if (now - lastTap.current < 280) {
      if (tapTimer.current) clearTimeout(tapTimer.current);
      tapTimer.current = null;
      lastTap.current = 0;
      onDoubleTapParilti();
      return;
    }
    lastTap.current = now;
    tapTimer.current = setTimeout(() => {
      setZoomOpen(true);
      tapTimer.current = null;
    }, 240);
  };

  const onSelectReaction = async (word) => {
    if (!post?.id) return;
    const prev = myReaction;
    if (prev === word) {
      setMyReaction(null);
      try { await removeReaction(post.id); } catch (e) {}
    } else {
      setMyReaction(word);
      try { await setReaction(post.id, word); } catch (e) {}
    }
    setShowChips(false);
    try { await resolveReactionCount(post.id); } catch (e) {}
  };

  const onSave = async () => {
    if (!post?.id) return;
    const next = !saved;
    setSaved(next);
    try {
      await toggleSave(post);
    } catch (e) {
      setSaved(!next);
    }
  };

  const onDelete = async () => {
    if (!post?.id || deleting) return;
    Alert.alert(
      'Anı sil?',
      'Bu anı profilinden ve akışlardan kaldırılacak.',
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Anı sil',
          onPress: async () => {
            setDeleting(true);
            try {
              await deletePost(post.id);
              navigation.goBack();
            } catch (e) {
              console.warn('[postDetail] an silinemedi:', e?.code || e?.message);
              setDeleting(false);
              setOptionsOpen(false);
            }
          },
        },
      ],
    );
  };

  const onArchive = async () => {
    if (!post?.id || archiving || deleting) return;
    const willArchive = !post.archived;
    setArchiving(true);
    try {
      await setPostArchived(post.id, willArchive);
      setPost((prev) => ({ ...prev, archived: willArchive }));
      setOptionsOpen(false);
      navigation.goBack(); // profil/arşiv ekranı odakta yeniden yüklenir
    } catch (e) {
      console.warn('[postDetail] arşivlenemedi:', e?.code || e?.message);
      setArchiving(false);
    }
  };

  const initial = (author?.username || author?.displayName || post?.authorName || '?').trim().charAt(0).toUpperCase() || '?';
  const imageRatio = post?.imageWidth && post?.imageHeight ? post.imageWidth / post.imageHeight : 4 / 5;
  const imageHeight = Math.min(width / Math.max(imageRatio, 0.55), width * 1.45);

  if (loading) {
    return (
      <Screen padded={false}>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={colors.accent} />
        </View>
      </Screen>
    );
  }

  if (!post) {
    return (
      <Screen padded={false}>
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingBottom: spacing.md }}>
          <Pressable onPress={() => navigation.goBack()} hitSlop={8}>
            <Ionicons name="chevron-back" size={26} color={colors.textPrimary} />
          </Pressable>
        </View>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: spacing.xl }}>
          <Ionicons name="image-outline" size={44} color={colors.textMuted} />
          <Text style={{ fontFamily: typography.fontBodyMedium, fontSize: typography.size.body, color: colors.textPrimary, marginTop: spacing.md }}>
            Gönderi bulunamadı
          </Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen padded={false}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: spacing.xxl }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingBottom: spacing.sm }}>
          <Pressable onPress={() => navigation.goBack()} hitSlop={8}>
            <Ionicons name="chevron-back" size={26} color={colors.textPrimary} />
          </Pressable>
          <Pressable onPress={goToAuthor} style={{ flex: 1, flexDirection: 'row', alignItems: 'center', marginLeft: spacing.sm }} hitSlop={6}>
            {author?.photoURL ? (
              <Image source={{ uri: author.photoURL }} style={{ width: 34, height: 34, borderRadius: radius.pill }} />
            ) : (
              <LinearGradient colors={gradients.sunset} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ width: 34, height: 34, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={{ fontFamily: typography.fontDisplay, fontSize: typography.size.footnote, color: '#FFFFFF' }}>{initial}</Text>
              </LinearGradient>
            )}
            <Text numberOfLines={1} style={{ flex: 1, marginLeft: spacing.sm, fontFamily: typography.fontBodyMedium, fontSize: typography.size.body, color: colors.textPrimary }}>
              {displayUser(author)}
            </Text>
          </Pressable>
          {post.authorUid === user?.uid ? (
            <Pressable onPress={() => setOptionsOpen(true)} disabled={deleting || archiving} hitSlop={8} style={{ marginLeft: spacing.sm, opacity: deleting || archiving ? 0.45 : 1 }}>
              <Ionicons name="ellipsis-horizontal" size={22} color={colors.textMuted} />
            </Pressable>
          ) : (
            <Pressable onPress={() => setModOpen(true)} hitSlop={8} style={{ marginLeft: spacing.sm }}>
              <Ionicons name="ellipsis-horizontal" size={22} color={colors.textMuted} />
            </Pressable>
          )}
        </View>

        <Pressable onPress={onPhotoPress}>
          <Image
            source={{ uri: post.imageURL }}
            style={{ width: '100%', height: imageHeight, backgroundColor: colors.border }}
            resizeMode="cover"
          />
          <Animated.View
            pointerEvents="none"
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: 0,
              bottom: 0,
              alignItems: 'center',
              justifyContent: 'center',
              opacity: sparkleOpacity,
              transform: [{ scale: sparkleScale }],
            }}
          >
            <Ionicons name="sparkles" size={88} color="#FFFFFF" style={{ textShadowColor: 'rgba(0,0,0,0.24)', textShadowRadius: 14 }} />
          </Animated.View>
        </Pressable>

        <View style={{ paddingHorizontal: spacing.lg, paddingTop: spacing.md }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Pressable onPress={onParilti} accessibilityLabel="Parlat" hitSlop={8}>
              <Animated.View style={{ transform: [{ scale }] }}>
                <Ionicons name={liked ? 'sparkles' : 'sparkles-outline'} size={24} color={liked ? sunset.orange : colors.textMuted} />
              </Animated.View>
            </Pressable>
              {(post.pariltiCount || 0) > 0 ? (
                <Pressable onPress={() => navigation.navigate('PariltiDetail', { postId: post.id })} hitSlop={8}>
                  <Text style={{ fontFamily: typography.fontBody, fontSize: typography.size.footnote, color: colors.textMuted, marginLeft: spacing.xs }}>
                    {(post.pariltiCount || 0)} parıltı
                  </Text>
                </Pressable>
              ) : (
                <Text style={{ fontFamily: typography.fontBody, fontSize: typography.size.footnote, color: colors.textMuted, marginLeft: spacing.xs }}>
                  0 parıltı
                </Text>
              )}
            </View>

            <View style={{ flex: 1 }} />

            <Pressable onPress={onSave} accessibilityLabel="Seçtiklerime ekle" style={{ marginRight: spacing.md }} hitSlop={8}>
              <SavedMemoryIcon size={24} color={saved ? sunset.orange : colors.textMuted} active={saved} />
            </Pressable>

            <Pressable
              onPress={() => setShowChips((s) => !s)}
              accessibilityLabel={myReaction ? `Vayb: ${myReaction}` : 'Vayb seç'}
              style={{
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 1,
                borderColor: myReaction ? sunset.orange : colors.border,
                backgroundColor: myReaction ? 'rgba(255,135,90,0.10)' : 'transparent',
                borderRadius: radius.pill,
                width: 34,
                height: 34,
              }}
              hitSlop={6}
            >
              <MoodTraceIcon size={18} color={myReaction ? sunset.orange : colors.textMuted} />
            </Pressable>
          </View>

          {showChips ? (
            <View style={{ marginTop: spacing.md }}>
              <Text style={{ fontFamily: typography.fontBodyMedium, fontSize: typography.size.footnote, color: colors.textPrimary, marginBottom: spacing.sm }}>
                Bu anın vaybı ne?
              </Text>
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs }}>
              {REACTIONS.map((word) => {
                const selected = myReaction === word;
                return (
                  <Pressable
                    key={word}
                    onPress={() => onSelectReaction(word)}
                    style={{
                      borderWidth: 1,
                      borderColor: selected ? sunset.orange : colors.border,
                      backgroundColor: selected ? 'rgba(255,135,90,0.12)' : colors.surface,
                      borderRadius: radius.pill,
                      paddingVertical: 6,
                      paddingHorizontal: spacing.md,
                    }}
                  >
                    <Text style={{ fontFamily: typography.fontBody, fontSize: typography.size.footnote, color: selected ? sunset.orange : colors.textPrimary }}>
                      {word}
                    </Text>
                  </Pressable>
                );
              })}
              </View>
            </View>
          ) : null}

          {post.caption ? (
            <Text style={{ fontFamily: typography.fontBody, fontSize: typography.size.body, color: colors.textPrimary, lineHeight: 22, marginTop: spacing.md }}>
              {post.caption}
            </Text>
          ) : null}

          {post.location?.name ? (
            <Pressable
              onPress={() => navigation.navigate('LocationPosts', { name: shortPlace(post.location.name), key: post.location.key || locationKey(post.location.name) })}
              style={{ flexDirection: 'row', alignItems: 'center', marginTop: spacing.sm }}
              hitSlop={4}
            >
              <Ionicons name="location-outline" size={14} color={colors.accent} />
              <Text numberOfLines={1} style={{ marginLeft: 4, fontFamily: typography.fontBody, fontSize: typography.size.footnote, color: colors.textMuted }}>
                {shortPlace(post.location.name)}
              </Text>
            </Pressable>
          ) : null}

          <View style={{ height: 1, backgroundColor: colors.border, marginVertical: spacing.lg }} />

          {reactionCount ? (
            <Pressable
              onPress={() => navigation.navigate('ReactionDetail', { postId: post.id })}
              style={{ flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start' }}
              hitSlop={8}
            >
              <MoodTraceIcon size={15} color={colors.textMuted} />
              <Text style={{ fontFamily: typography.fontBody, fontSize: typography.size.footnote, color: colors.textMuted, marginLeft: 5 }}>
                {reactionCount} vayb
              </Text>
            </Pressable>
          ) : (
            <Text style={{ fontFamily: typography.fontBody, fontSize: typography.size.footnote, color: colors.textMuted }}>
              Henüz vayb yok.
            </Text>
          )}
        </View>
      </ScrollView>

      <Modal visible={zoomOpen} transparent animationType="fade" onRequestClose={() => setZoomOpen(false)} statusBarTranslucent>
        <Pressable onPress={() => setZoomOpen(false)} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.94)', alignItems: 'center', justifyContent: 'center' }}>
          <Image source={{ uri: post.imageURL }} style={{ width: '100%', height: '100%' }} resizeMode="contain" />
          <Pressable onPress={() => setZoomOpen(false)} hitSlop={10} style={{ position: 'absolute', top: spacing.xxl, right: spacing.lg }}>
            <Ionicons name="close" size={28} color="#FFFFFF" />
          </Pressable>
        </Pressable>
      </Modal>
      <PostOptionsSheet
        visible={optionsOpen}
        onClose={() => setOptionsOpen(false)}
        onDelete={onDelete}
        deleting={deleting}
        onArchive={onArchive}
        archiving={archiving}
        archived={!!post.archived}
      />
      <ModerationSheet
        visible={modOpen}
        onClose={() => setModOpen(false)}
        targetLabel="Bu gönderi"
        reportLabel="Gönderiyi şikayet et"
        showBlock={false}
        onReport={async (reason) => {
          setModOpen(false);
          try {
            await reportPost(post, reason);
            Alert.alert('Bildirin alındı', 'İncelenmek üzere iletildi. Teşekkürler.');
          } catch (e) {
            Alert.alert('Gönderilemedi', 'Şikayet iletilemedi. Tekrar dene.');
          }
        }}
      />
    </Screen>
  );
}
