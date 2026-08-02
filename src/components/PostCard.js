// PostCard — akıştaki tek gönderi kartı. Faz 4 + 6B.
// Tasarım ilkesi: fotoğraf kral. Parıltı (yıldız/sparkle) + kısa tepki (his
// kelimeleri) küçük ve zarif — fotoğrafı boğmaz. "Beğeni/yorum" dili YOK.

import { useState, useEffect, useRef } from 'react';
import { Alert, View, Text, Image, Pressable, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { shortPlace, locationKey } from '../utils/location';
import PostOptionsSheet from './PostOptionsSheet';
import MoodTraceIcon from './MoodTraceIcon';
import SavedMemoryIcon from './SavedMemoryIcon';
import {
  REACTIONS, getMyParilti, toggleParilti, getMyReaction, setReaction, removeReaction, getReactionSummary,
} from '../services/engagement';
import { getMySave, toggleSave } from '../services/saves';
import { deletePost } from '../services/posts';

// Aynı kullanıcıyı defalarca çekmemek için basit önbellek.
const userCache = new Map();

async function resolveUser(uid) {
  let info = userCache.get(uid);
  if (info) return info;
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    const d = snap.exists() ? snap.data() : {};
    info = { username: d.username, displayName: d.displayName, photoURL: d.photoURL };
  } catch (e) {
    info = {};
  }
  userCache.set(uid, info);
  return info;
}

// Firestore Timestamp / Date / null → "az önce", "5 dk önce", "3 g önce"…
function zamanOnce(createdAt) {
  const date = createdAt?.toDate ? createdAt.toDate() : createdAt ? new Date(createdAt) : null;
  if (!date) return 'az önce';
  const sn = Math.max(0, Math.floor((Date.now() - date.getTime()) / 1000));
  if (sn < 60) return 'az önce';
  const dk = Math.floor(sn / 60);
  if (dk < 60) return `${dk} dk önce`;
  const sa = Math.floor(dk / 60);
  if (sa < 24) return `${sa} sa önce`;
  const g = Math.floor(sa / 24);
  if (g < 7) return `${g} g önce`;
  const hf = Math.floor(g / 7);
  if (hf < 5) return `${hf} hf önce`;
  return date.toLocaleDateString('tr-TR', { day: 'numeric', month: 'short' });
}

export default function PostCard({ post }) {
  const { theme } = useTheme();
  const { colors, typography, spacing, radius, gradients, sunset } = theme;
  const navigation = useNavigation();
  const { user } = useAuth();
  const goToDetail = () => navigation.navigate('PostDetail', { post });
  const goToAuthor = () => {
    if (post.authorUid === user?.uid) navigation.navigate('Main', { screen: 'Profile' });
    else navigation.navigate('UserProfile', { uid: post.authorUid });
  };

  const [author, setAuthor] = useState(userCache.get(post.authorUid) || null);

  // Parıltı & tepki durumu
  const [pariltiCount, setPariltiCount] = useState(post.pariltiCount || 0);
  const [liked, setLiked] = useState(false);
  const [myReaction, setMyReaction] = useState(null);
  const [summary, setSummary] = useState({}); // { kelime: [uid,...] }
  const [saved, setSaved] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showChips, setShowChips] = useState(false);

  const scale = useRef(new Animated.Value(1)).current;
  const sparkleScale = useRef(new Animated.Value(0.4)).current;
  const sparkleOpacity = useRef(new Animated.Value(0)).current;
  const lastTap = useRef(0);
  const tapTimer = useRef(null);

  useEffect(() => {
    let alive = true;
    if (!author) resolveUser(post.authorUid).then((info) => alive && setAuthor(info));
    (async () => {
      try {
        const [lk, mr, sm, sv] = await Promise.all([
          getMyParilti(post.id, user.uid),
          getMyReaction(post.id, user.uid),
          getReactionSummary(post.id),
          getMySave(post.id, user.uid),
        ]);
        if (!alive) return;
        setLiked(lk);
        setMyReaction(mr);
        setSummary(sm);
        setSaved(sv);
      } catch (e) {
        /* sessiz geç */
      }
    })();
    return () => { alive = false; };
  }, [post.id, post.authorUid, user.uid]);

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
        Animated.timing(sparkleOpacity, { toValue: 0, duration: 520, useNativeDriver: true }),
      ]),
      Animated.spring(sparkleScale, { toValue: 1.35, friction: 5, tension: 95, useNativeDriver: true }),
    ]).start();
  };

  // Parlat / geri al (optimistik)
  const onParilti = async () => {
    const next = !liked;
    setLiked(next);
    setPariltiCount((c) => Math.max(0, c + (next ? 1 : -1)));
    if (next) popAnim();
    try {
      await toggleParilti(post.id);
    } catch (e) {
      setLiked(!next);
      setPariltiCount((c) => Math.max(0, c + (next ? -1 : 1)));
    }
  };

  const onDoubleTapParilti = async () => {
    sparkleAnim();
    if (liked) return;
    setLiked(true);
    setPariltiCount((c) => c + 1);
    popAnim();
    try {
      await toggleParilti(post.id);
    } catch (e) {
      setLiked(false);
      setPariltiCount((c) => Math.max(0, c - 1));
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
      goToDetail();
      tapTimer.current = null;
    }, 240);
  };

  // Tepki seç / değiştir / geri al
  const onSelectReaction = async (word) => {
    const prev = myReaction;
    if (prev === word) {
      setMyReaction(null);
      try { await removeReaction(post.id); } catch (e) {}
    } else {
      setMyReaction(word);
      try { await setReaction(post.id, word); } catch (e) {}
    }
    setShowChips(false);
    try { setSummary(await getReactionSummary(post.id)); } catch (e) {}
  };

  const onSave = async () => {
    const next = !saved;
    setSaved(next);
    try {
      await toggleSave(post);
    } catch (e) {
      setSaved(!next);
    }
  };

  const onDelete = async () => {
    if (deleting) return;
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
              setHidden(true);
            } catch (e) {
              console.warn('[post] an silinemedi:', e?.code || e?.message);
              setDeleting(false);
              setOptionsOpen(false);
            }
          },
        },
      ],
    );
  };

  const uname = author?.username || author?.displayName || post.authorName || 'vayb kullanıcısı';
  const initial = (author?.username || author?.displayName || post.authorName || '?').trim().charAt(0).toUpperCase() || '?';
  const imageRatio = post.imageWidth && post.imageHeight ? Math.min(1.35, Math.max(0.62, post.imageWidth / post.imageHeight)) : 4 / 5;
  const summaryEntries = Object.entries(summary).filter(([, uids]) => uids.length > 0);
  const reactionCount = summaryEntries.reduce((total, [, uids]) => total + uids.length, 0);

  if (hidden) return null;

  return (
    <View
      style={{
        backgroundColor: colors.surface,
        borderRadius: radius.card,
        borderWidth: 1,
        borderColor: colors.border,
        overflow: 'hidden',
        marginBottom: spacing.xl,
        shadowColor: '#000',
        shadowOpacity: 0.06,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 4 },
        elevation: 2,
      }}
    >
      {/* Üst satır: avatar + kullanıcı adı (tıklanınca profile) + göreli zaman */}
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.md, paddingVertical: spacing.sm }}>
        <Pressable onPress={goToAuthor} style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }} hitSlop={6}>
          {author?.photoURL ? (
            <Image source={{ uri: author.photoURL }} style={{ width: 36, height: 36, borderRadius: radius.pill }} />
          ) : (
            <LinearGradient colors={gradients.sunset} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ width: 36, height: 36, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' }}>
              <Text style={{ fontFamily: typography.fontDisplay, fontSize: typography.size.footnote, color: '#FFFFFF' }}>{initial}</Text>
            </LinearGradient>
          )}
          <Text numberOfLines={1} style={{ flex: 1, marginLeft: spacing.sm, fontFamily: typography.fontBodyMedium, fontSize: typography.size.body, color: colors.textPrimary }}>
            {uname}
          </Text>
        </Pressable>
        <Text style={{ fontFamily: typography.fontBody, fontSize: typography.size.caption, color: colors.textMuted, marginLeft: spacing.sm }}>
          {zamanOnce(post.createdAt)}
        </Text>
        {post.authorUid === user?.uid ? (
          <Pressable onPress={() => setOptionsOpen(true)} disabled={deleting} hitSlop={8} style={{ marginLeft: spacing.sm, opacity: deleting ? 0.45 : 1 }}>
            <Ionicons name="ellipsis-horizontal" size={20} color={colors.textMuted} />
          </Pressable>
        ) : null}
      </View>

      {/* Fotoğraf — sabit 4:5, tam genişlik */}
      <Pressable onPress={onPhotoPress}>
        <Image source={{ uri: post.imageURL, cache: 'force-cache' }} style={{ width: '100%', aspectRatio: imageRatio }} resizeMode="cover" fadeDuration={0} />
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
          <Ionicons name="sparkles" size={76} color="#FFFFFF" style={{ textShadowColor: 'rgba(0,0,0,0.22)', textShadowRadius: 12 }} />
        </Animated.View>
      </Pressable>

      {/* Aksiyonlar + caption + tepkiler */}
      <View style={{ paddingHorizontal: spacing.md, paddingTop: spacing.sm, paddingBottom: spacing.md }}>
        {/* Parıltı + his seçici */}
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Pressable onPress={onParilti} accessibilityLabel="Parlat" hitSlop={8}>
            <Animated.View style={{ transform: [{ scale }] }}>
              <Ionicons name={liked ? 'sparkles' : 'sparkles-outline'} size={22} color={liked ? sunset.orange : colors.textMuted} />
            </Animated.View>
          </Pressable>
            {pariltiCount > 0 ? (
              <Pressable onPress={() => navigation.navigate('PariltiDetail', { postId: post.id })} hitSlop={8}>
                <Text style={{ fontFamily: typography.fontBody, fontSize: typography.size.footnote, color: colors.textMuted, marginLeft: spacing.xs }}>
                  {pariltiCount} parıltı
                </Text>
              </Pressable>
            ) : null}
          </View>

          <View style={{ flex: 1 }} />

          <Pressable onPress={onSave} accessibilityLabel="Seçtiklerime ekle" style={{ marginRight: spacing.md }} hitSlop={8}>
            <SavedMemoryIcon size={22} color={saved ? sunset.orange : colors.textMuted} active={saved} />
          </Pressable>

          {/* His seçici */}
          <Pressable
            onPress={() => setShowChips((s) => !s)}
            accessibilityLabel={myReaction ? `His: ${myReaction}` : 'His seç'}
            style={{
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1,
              borderColor: myReaction ? sunset.orange : colors.border,
              backgroundColor: myReaction ? 'rgba(255,135,90,0.10)' : 'transparent',
              borderRadius: radius.pill,
              width: 32,
              height: 32,
            }}
            hitSlop={6}
          >
            <MoodTraceIcon size={17} color={myReaction ? sunset.orange : colors.textMuted} />
          </Pressable>
        </View>

        {/* His kelimeleri (chip seçici) */}
        {showChips ? (
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: spacing.sm, gap: spacing.xs }}>
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
                    paddingVertical: 5,
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
        ) : null}

        {/* Caption */}
        {post.caption ? (
          <Text style={{ fontFamily: typography.fontBody, fontSize: typography.size.body, color: colors.textPrimary, lineHeight: 21, marginTop: spacing.sm }}>
            {post.caption}
          </Text>
        ) : null}

        {/* Konum */}
        {post.location?.name ? (
          <Pressable
            onPress={() => navigation.navigate('LocationPosts', { name: shortPlace(post.location.name), key: post.location.key || locationKey(post.location.name) })}
            style={{ flexDirection: 'row', alignItems: 'center', marginTop: spacing.xs }}
            hitSlop={4}
          >
            <Ionicons name="location-outline" size={14} color={colors.accent} />
            <Text numberOfLines={1} style={{ marginLeft: 4, fontFamily: typography.fontBody, fontSize: typography.size.footnote, color: colors.textMuted }}>
              {shortPlace(post.location.name)}
            </Text>
          </Pressable>
        ) : null}

        {/* Tepki özeti — liste ayrı ekranda açılır */}
        {reactionCount ? (
          <Pressable
            onPress={() => navigation.navigate('ReactionDetail', { postId: post.id })}
            style={{ flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', marginTop: spacing.sm }}
            hitSlop={8}
          >
            <MoodTraceIcon size={14} color={colors.textMuted} />
            <Text style={{ fontFamily: typography.fontBody, fontSize: typography.size.caption, color: colors.textMuted, marginLeft: 4 }}>
              {reactionCount} vayb
            </Text>
          </Pressable>
        ) : null}
      </View>
      <PostOptionsSheet visible={optionsOpen} onClose={() => setOptionsOpen(false)} onDelete={onDelete} deleting={deleting} />
    </View>
  );
}
