// ProfileScreen — profil (kendi VEYA başka kullanıcı) — Faz 5 + 6A
// route.params.uid verilmezse kendi profilim. Kendimse: Düzenle + ayarlar +
// (varsa) takip istekleri. Başkasıysa: Takip et/Bırak/İstek. Gizli + takip
// etmiyorsam postlar gizli ("Bu hesap gizli").

import { useState, useCallback } from 'react';
import { Alert, View, Text, Image, Pressable, ScrollView, ActivityIndicator, useWindowDimensions } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../components/Screen';
import MasonryGrid from '../components/MasonryGrid';
import GradientButton from '../components/GradientButton';
import SettingsDrawer from '../components/SettingsDrawer';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { getUserProfile, getUserPosts } from '../services/users';
import { getFollowStatus, follow, unfollow, getPendingRequests } from '../services/follows';
import ModerationSheet from '../components/ModerationSheet';
import { isBlocked, isBlockedByUser, blockUser, unblockUser, reportUser } from '../services/moderation';
import { getUnreadNotificationCount } from '../services/notifications';
import { createOrGetConversation } from '../services/chats';

function Stat({ value, label, onPress }) {
  const { theme } = useTheme();
  const { colors, typography, spacing } = theme;
  const content = (
    <>
      <Text style={{ fontFamily: typography.fontDisplay, fontSize: typography.size.title, color: colors.textPrimary }}>
        {value}
      </Text>
      <Text style={{ fontFamily: typography.fontBody, fontSize: typography.size.caption, color: colors.textMuted, marginTop: 2 }}>
        {label}
      </Text>
    </>
  );
  if (onPress) {
    return (
      <Pressable onPress={onPress} hitSlop={8} style={({ pressed }) => ({ alignItems: 'center', marginHorizontal: spacing.lg, opacity: pressed ? 0.65 : 1 })}>
        {content}
      </Pressable>
    );
  }
  return (
    <View style={{ alignItems: 'center', marginHorizontal: spacing.lg }}>
      {content}
    </View>
  );
}

export default function ProfileScreen({ navigation, route }) {
  const { theme } = useTheme();
  const { colors, typography, spacing, radius, gradients } = theme;
  const { user, refreshProfile } = useAuth();
  const { width: screenW } = useWindowDimensions();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const uid = route?.params?.uid || user.uid;
  const isSelf = uid === user.uid;

  const [data, setData] = useState(null);
  const [posts, setPosts] = useState([]);
  const [canView, setCanView] = useState(true);
  const [followStatus, setFollowStatus] = useState(null); // null | 'pending' | 'accepted'
  const [notificationCount, setNotificationCount] = useState(0); // takip isteği + okunmamış bildirim
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [modOpen, setModOpen] = useState(false);
  const [iBlocked, setIBlocked] = useState(false);
  const [blockedMe, setBlockedMe] = useState(false); // karşı taraf beni engelledi mi

  const sidePad = spacing.xl;
  const gap = spacing.md;
  const columnWidth = (screenW - sidePad * 2 - gap) / 2;
  const openPost = useCallback((post) => navigation.navigate('PostDetail', { post }), [navigation]);

  const load = useCallback(async () => {
    try {
      const prof = await getUserProfile(uid);
      let status = null;
      let blockedByMe = false;
      let heBlockedMe = false;
      if (!isSelf) {
        [status, blockedByMe, heBlockedMe] = await Promise.all([
          getFollowStatus(user.uid, uid),
          isBlocked(uid),
          isBlockedByUser(uid),
        ]);
        setIBlocked(blockedByMe);
        setBlockedMe(heBlockedMe);
      }
      // Beni engelleyenin profilini de göremem (çift yönlü engel).
      const view = isSelf || (!blockedByMe && !heBlockedMe && (!prof?.isPrivate || status === 'accepted'));
      const p = view ? await getUserPosts(uid) : [];
      setData(prof);
      setFollowStatus(status);
      setCanView(view);
      setPosts(p);
      if (isSelf) {
        refreshProfile();
        const [reqs, unread] = await Promise.all([
          getPendingRequests(uid),
          getUnreadNotificationCount(uid),
        ]);
        setNotificationCount(reqs.length + unread);
      }
    } catch (e) {
      /* sessiz geç */
    } finally {
      setLoading(false);
    }
  }, [uid, isSelf, user.uid, refreshProfile]);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const onBlockToggle = async () => {
    setModOpen(false);
    // Engeli kaldırma anında yapılır; engelleme geri dönüşü zor olduğundan onay sorulur.
    if (iBlocked) {
      try {
        await unblockUser(uid);
        await load();
      } catch (e) {
        Alert.alert('İşlem başarısız', 'Engelleme güncellenemedi. Bağlantını kontrol edip tekrar dene.');
      }
      return;
    }
    const name = data?.username || data?.displayName || 'Bu kullanıcı';
    Alert.alert(
      'Engellensin mi?',
      `${name} engellenecek. Gönderileriniz birbirinize görünmez, mesajlaşamazsınız ve varsa takip bağınız kalkar. İstediğinde ⋯ menüsünden engeli kaldırabilirsin.`,
      [
        { text: 'Vazgeç', style: 'cancel' },
        {
          text: 'Engelle',
          style: 'destructive',
          onPress: async () => {
            try {
              await blockUser(uid);
              await load();
            } catch (e) {
              Alert.alert('İşlem başarısız', 'Engelleme güncellenemedi. Bağlantını kontrol edip tekrar dene.');
            }
          },
        },
      ],
    );
  };

  const onReport = async (reason) => {
    setModOpen(false);
    try {
      await reportUser(uid, reason);
      Alert.alert('Bildirin alındı', 'İncelenmek üzere iletildi. Teşekkürler.');
    } catch (e) {
      Alert.alert('Gönderilemedi', 'Şikayet iletilemedi. Tekrar dene.');
    }
  };

  const onFollowPress = async () => {
    if (acting) return;
    setActing(true);
    try {
      if (followStatus === 'accepted' || followStatus === 'pending') {
        await unfollow(uid); // bırak / isteği geri çek
      } else {
        await follow(uid, !!data?.isPrivate);
      }
      await load();
    } catch (e) {
      /* sessiz geç */
    } finally {
      setActing(false);
    }
  };

  const openChat = async () => {
    if (acting || isSelf) return;
    setActing(true);
    try {
      const conversationId = await createOrGetConversation(uid);
      navigation.navigate('Chat', { conversationId, otherUid: uid });
    } catch (e) {
      console.warn('[profile] sohbet açılamadı:', e?.code || e?.message);
    } finally {
      setActing(false);
    }
  };

  const displayName = data?.displayName || 'Vayb kullanıcısı';
  const username = data?.username || '';
  const bio = data?.bio || '';
  const followers = data?.followersCount ?? 0;
  const following = data?.followingCount ?? 0;

  if (loading) {
    return (
      <Screen>
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={colors.accent} />
        </View>
      </Screen>
    );
  }

  return (
    <Screen padded={false}>
      <ScrollView contentContainerStyle={{ paddingHorizontal: sidePad, paddingBottom: spacing.xxl }} showsVerticalScrollIndicator={false}>
        {/* Üst bar: başkasıysa geri + isim; kendimse marka + menü (☰) */}
        {!isSelf ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingBottom: spacing.sm }}>
            <Pressable onPress={() => navigation.goBack()} hitSlop={8}>
              <Ionicons name="chevron-back" size={26} color={colors.textPrimary} />
            </Pressable>
            <Text numberOfLines={1} style={{ flex: 1, textAlign: 'center', fontFamily: typography.fontDisplayMedium, fontSize: typography.size.body, color: colors.textPrimary }}>
              {username || displayName}
            </Text>
            <Pressable onPress={() => setModOpen(true)} hitSlop={8} style={{ width: 26, alignItems: 'flex-end' }}>
              <Ionicons name="ellipsis-horizontal" size={22} color={colors.textPrimary} />
            </Pressable>
          </View>
        ) : (
          <View style={{ flexDirection: 'row', alignItems: 'center', paddingBottom: spacing.sm }}>
            <Pressable onPress={() => navigation.navigate('Notifications')} hitSlop={8} accessibilityLabel="Bildirimler" style={{ width: 32, height: 32, alignItems: 'flex-start', justifyContent: 'center' }}>
              {notificationCount > 0 ? (
                <>
                  <Ionicons name="notifications-outline" size={24} color={colors.textPrimary} />
                  <View
                    style={{
                      position: 'absolute',
                      top: 1,
                      right: 1,
                      minWidth: 16,
                      height: 16,
                      borderRadius: radius.pill,
                      backgroundColor: colors.accent,
                      alignItems: 'center',
                      justifyContent: 'center',
                      paddingHorizontal: 4,
                    }}
                  >
                    <Text style={{ fontFamily: typography.fontBodyMedium, fontSize: 9, color: '#FFFFFF' }}>
                      {notificationCount > 9 ? '9+' : notificationCount}
                    </Text>
                  </View>
                </>
              ) : null}
            </Pressable>
            <View style={{ flex: 1 }} />
            <Pressable onPress={() => setDrawerOpen(true)} hitSlop={8} accessibilityLabel="Menü">
              <Ionicons name="menu" size={26} color={colors.textPrimary} />
            </Pressable>
          </View>
        )}

        {/* --- Profil başlığı --- */}
        <View style={{ alignItems: 'center', paddingTop: spacing.sm }}>
          {data?.photoURL ? (
            <Image source={{ uri: data.photoURL }} style={{ width: 96, height: 96, borderRadius: radius.pill }} />
          ) : (
            <LinearGradient colors={gradients.sunset} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ width: 96, height: 96, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name="person" size={44} color="#FFFFFF" />
            </LinearGradient>
          )}

          <Text style={{ fontFamily: typography.fontDisplay, fontSize: typography.size.title, color: colors.textPrimary, marginTop: spacing.md }}>
            {displayName}
          </Text>
          {username ? (
            <Text style={{ fontFamily: typography.fontBody, fontSize: typography.size.footnote, color: colors.textMuted, marginTop: 2 }}>
              {username}
            </Text>
          ) : null}
          {bio ? (
            <Text style={{ fontFamily: typography.fontBody, fontSize: typography.size.footnote, color: colors.textPrimary, textAlign: 'center', marginTop: spacing.sm, lineHeight: 20, maxWidth: 300 }}>
              {bio}
            </Text>
          ) : null}

          {/* İstatistikler */}
          <View style={{ flexDirection: 'row', marginTop: spacing.lg }}>
            <Stat value={canView ? posts.length : '·'} label="an" />
            <Stat value={followers} label="takipçi" onPress={() => navigation.navigate('UserList', { uid, type: 'followers' })} />
            <Stat value={following} label="takip" onPress={() => navigation.navigate('UserList', { uid, type: 'following' })} />
          </View>

          {/* Aksiyon: kendimse Düzenle, başkasıysa Takip butonu */}
          {isSelf ? (
            <>
              <Pressable
                onPress={() => navigation.navigate('EditProfile')}
                style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: colors.border, borderRadius: radius.button, paddingVertical: spacing.sm, paddingHorizontal: spacing.xl, marginTop: spacing.lg, opacity: pressed ? 0.7 : 1 })}
              >
                <Ionicons name="create-outline" size={16} color={colors.textPrimary} />
                <Text style={{ fontFamily: typography.fontBodyMedium, fontSize: typography.size.footnote, color: colors.textPrimary, marginLeft: spacing.xs }}>
                  Profili düzenle
                </Text>
              </Pressable>

            </>
          ) : (blockedMe || iBlocked) ? null : (
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: spacing.lg }}>
              {followStatus === 'accepted' ? (
                <Pressable
                  onPress={openChat}
                  disabled={acting}
                  accessibilityLabel="Sohbet"
                  style={({ pressed }) => ({
                    width: 44,
                    height: 44,
                    borderRadius: radius.pill,
                    borderWidth: 1,
                    borderColor: colors.border,
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: spacing.sm,
                    opacity: pressed || acting ? 0.6 : 1,
                  })}
                  hitSlop={6}
                >
                  <Ionicons name="paper-plane-outline" size={20} color={colors.textPrimary} />
                </Pressable>
              ) : null}
              <View style={{ width: followStatus === 'accepted' ? 168 : 220 }}>
              <GradientButton
                label={
                  followStatus === 'accepted' ? 'Takibi bırak'
                    : followStatus === 'pending' ? 'İstek gönderildi'
                    : data?.isPrivate ? 'İstek gönder'
                    : 'Takip et'
                }
                onPress={onFollowPress}
                loading={acting}
                variant={followStatus ? 'ghost' : 'solid'}
              />
              </View>
            </View>
          )}
        </View>

        {/* --- Fotoğraflar / engelli / gizli / boş --- */}
        <View style={{ marginTop: spacing.xxl }}>
          {iBlocked ? (
            <View style={{ alignItems: 'center', paddingVertical: spacing.xxl }}>
              <Ionicons name="ban-outline" size={40} color={colors.textMuted} />
              <Text style={{ fontFamily: typography.fontBodyMedium, fontSize: typography.size.body, color: colors.textPrimary, marginTop: spacing.md }}>
                Bu kullanıcıyı engelledin
              </Text>
              <Text style={{ fontFamily: typography.fontBody, fontSize: typography.size.footnote, color: colors.textMuted, textAlign: 'center', marginTop: spacing.xs, maxWidth: 260, lineHeight: 20 }}>
                Gönderileri gizlendi ve sana mesaj gönderemez. ⋯ menüsünden engeli kaldırabilirsin.
              </Text>
            </View>
          ) : blockedMe ? (
            <View style={{ alignItems: 'center', paddingVertical: spacing.xxl }}>
              <Ionicons name="lock-closed-outline" size={40} color={colors.textMuted} />
              <Text style={{ fontFamily: typography.fontBodyMedium, fontSize: typography.size.body, color: colors.textPrimary, marginTop: spacing.md }}>
                Bu profil kullanılamıyor
              </Text>
              <Text style={{ fontFamily: typography.fontBody, fontSize: typography.size.footnote, color: colors.textMuted, textAlign: 'center', marginTop: spacing.xs, maxWidth: 260, lineHeight: 20 }}>
                Bu hesabın içeriğine şu anda erişemezsin.
              </Text>
            </View>
          ) : !canView ? (
            <View style={{ alignItems: 'center', paddingVertical: spacing.xxl }}>
              <Ionicons name="lock-closed-outline" size={40} color={colors.textMuted} />
              <Text style={{ fontFamily: typography.fontBodyMedium, fontSize: typography.size.body, color: colors.textPrimary, marginTop: spacing.md }}>
                Bu hesap gizli
              </Text>
              <Text style={{ fontFamily: typography.fontBody, fontSize: typography.size.footnote, color: colors.textMuted, textAlign: 'center', marginTop: spacing.xs, maxWidth: 260, lineHeight: 20 }}>
                Karelerini görmek için takip isteği gönder ve onaylanmasını bekle.
              </Text>
            </View>
          ) : posts.length ? (
            <MasonryGrid posts={posts} columnWidth={columnWidth} gap={gap} onPressPost={openPost} />
          ) : (
            <View style={{ alignItems: 'center', paddingVertical: spacing.xxl }}>
              <Ionicons name="images-outline" size={40} color={colors.textMuted} />
              <Text style={{ fontFamily: typography.fontBodyMedium, fontSize: typography.size.body, color: colors.textPrimary, marginTop: spacing.md }}>
                {isSelf ? 'Henüz an paylaşmadın' : 'Henüz an paylaşmamış'}
              </Text>
              {isSelf ? (
                <Text style={{ fontFamily: typography.fontBody, fontSize: typography.size.footnote, color: colors.textMuted, textAlign: 'center', marginTop: spacing.xs, maxWidth: 260, lineHeight: 20 }}>
                  Paylaştığın kareler burada bir mood board gibi toplanacak.
                </Text>
              ) : null}
            </View>
          )}
        </View>

      </ScrollView>

      {/* Yan çubuk: tema + ayarlar + çıkış (yalnızca kendi profilimde açılır) */}
      {isSelf ? <SettingsDrawer visible={drawerOpen} onClose={() => setDrawerOpen(false)} /> : (
        <ModerationSheet
          visible={modOpen}
          onClose={() => setModOpen(false)}
          targetLabel={username || displayName}
          reportLabel="Kullanıcıyı şikayet et"
          showBlock
          blocked={iBlocked}
          onBlockToggle={onBlockToggle}
          onReport={onReport}
        />
      )}
    </Screen>
  );
}
