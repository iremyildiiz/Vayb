// TabNavigator — alt sekmeler: Vaybla · Anasayfa · Paylaş · Profil
// Aktif renk NÖTR (metin rengi) — pembe vurgu YOK, unisex.
// Kompakt tabbar (küçük yükseklik/ikon). Profil ikonu = kullanıcı fotoğrafı,
// Paylaş ikonu = yuvarlatılmış kare + artı (ShareTabIcon).

import { useCallback, useEffect, useState } from 'react';
import { Pressable, Text, useWindowDimensions, View } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import ProfileTabIcon from '../components/ProfileTabIcon';
import ShareTabIcon from '../components/ShareTabIcon';
import VayblaTabIcon from '../components/VayblaTabIcon';
import ExploreScreen from '../screens/ExploreScreen';
import FeedScreen from '../screens/FeedScreen';
import ShareScreen from '../screens/ShareScreen';
import ProfileStackNavigator from './ProfileStackNavigator';
import { getPendingRequests } from '../services/follows';
import { getUnreadNotificationCount } from '../services/notifications';

const Tab = createBottomTabNavigator();

const ICON = 22;
const ICON_SLOT = 28;

const ICONS = {
  Feed: { active: 'home', inactive: 'home-outline' },
};

const COACH_STEPS = [
  { title: 'Vaybla', body: 'Yeni vaybları ve anları burada keşfet.', position: 0.125 },
  { title: 'Anasayfa', body: 'Takip ettiklerinin anları burada akar.', position: 0.375 },
  { title: 'Paylaş', body: 'Gördüğün güzel bir anı paylaş.', position: 0.625 },
  { title: 'Profil', body: 'Anıların ve hesabın burada.', position: 0.875 },
];

export default function TabNavigator() {
  const { theme } = useTheme();
  const { colors, typography, radius, spacing } = theme;
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [feedHasActivity, setFeedHasActivity] = useState(false);
  const [coachStep, setCoachStep] = useState(null);

  useEffect(() => {
    let active = true;
    if (!user?.uid) return () => { active = false; };

    AsyncStorage.getItem(`vayb:onboarding:v1:${user.uid}`)
      .then((value) => {
        if (active && value !== 'seen') setCoachStep(0);
      })
      .catch(() => {
        if (active) setCoachStep(0);
      });

    return () => { active = false; };
  }, [user?.uid]);

  useFocusEffect(useCallback(() => {
    let alive = true;
    (async () => {
      if (!user?.uid) return;
      try {
        const [reqs, unread] = await Promise.all([
          getPendingRequests(user.uid),
          getUnreadNotificationCount(user.uid),
        ]);
        if (alive) setFeedHasActivity(reqs.length + unread > 0);
      } catch (e) {
        if (alive) setFeedHasActivity(false);
      }
    })();
    return () => { alive = false; };
  }, [user?.uid]));

  const withFeedDot = (node) => (
    <View>
      {node}
      {feedHasActivity ? (
        <View
          style={{
            position: 'absolute',
            top: -2,
            right: -5,
            width: 7,
            height: 7,
            borderRadius: radius.pill,
            backgroundColor: colors.accent,
            borderWidth: 1,
            borderColor: colors.surface,
          }}
        />
      ) : null}
    </View>
  );

  const finishCoach = async () => {
    if (user?.uid) await AsyncStorage.setItem(`vayb:onboarding:v1:${user.uid}`, 'seen');
    setCoachStep(null);
  };

  const nextCoachStep = () => {
    if (coachStep === COACH_STEPS.length - 1) {
      finishCoach();
      return;
    }
    setCoachStep((current) => current + 1);
  };

  const coach = coachStep === null ? null : COACH_STEPS[coachStep];
  const bubbleWidth = Math.min(264, width - 32);
  const bubbleLeft = coach
    ? Math.max(16, Math.min(width - bubbleWidth - 16, width * coach.position - bubbleWidth / 2))
    : 16;
  const arrowLeft = coach ? Math.max(22, Math.min(bubbleWidth - 22, width * coach.position - bubbleLeft - 6)) : 24;

  return (
    <View style={{ flex: 1 }}>
    <Tab.Navigator
      initialRouteName="Feed"
      screenOptions={({ route }) => ({
        headerShown: false,
        // Aktif/basılı vurgu nötr — pembe DEĞİL (unisex, rahatsız etmeyen).
        tabBarActiveTintColor: colors.textPrimary,
        tabBarInactiveTintColor: colors.textMuted,
        // Kompakt: güvenli alanı hesaba katan makul yükseklik.
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          height: 50 + insets.bottom,
          paddingTop: 6,
          paddingBottom: insets.bottom > 0 ? insets.bottom - 4 : 6,
        },
        tabBarLabelStyle: {
          fontFamily: typography.fontBodyMedium,
          fontSize: 10,
          marginTop: 1,
        },
        // Her ikon aynı görünür alanı kullanır; özel ikonlar yer değiştirmez.
        tabBarIconStyle: { width: ICON_SLOT, height: ICON_SLOT, marginTop: 1, alignItems: 'center', justifyContent: 'center' },
        tabBarIcon: ({ color, size, focused }) => {
          if (route.name === 'Explore') return <VayblaTabIcon focused={focused} color={color} size={ICON} />;
          if (route.name === 'Profile') return <ProfileTabIcon focused={focused} color={color} size={ICON} />;
          if (route.name === 'Share') return <ShareTabIcon focused={focused} color={color} size={ICON} />;
          const set = ICONS[route.name];
          const icon = <Ionicons name={focused ? set.active : set.inactive} size={ICON} color={color} />;
          return route.name === 'Feed' ? withFeedDot(icon) : icon;
        },
      })}
    >
      <Tab.Screen name="Explore" component={ExploreScreen} options={{ title: 'Vaybla' }} />
      <Tab.Screen name="Feed" component={FeedScreen} options={{ title: 'Anasayfa' }} />
      <Tab.Screen name="Share" component={ShareScreen} options={{ title: 'Paylaş' }} />
      <Tab.Screen name="Profile" component={ProfileStackNavigator} options={{ title: 'Profil' }} />
    </Tab.Navigator>
    {coach ? (
      <View pointerEvents="box-none" style={{ position: 'absolute', inset: 0 }}>
        <View
          style={{
            position: 'absolute',
            left: bubbleLeft,
            bottom: 62 + insets.bottom,
            width: bubbleWidth,
            borderRadius: radius.input,
            backgroundColor: colors.surface,
            borderWidth: 1,
            borderColor: colors.border,
            padding: spacing.md,
            shadowColor: '#000000',
            shadowOpacity: 0.14,
            shadowRadius: 16,
            shadowOffset: { width: 0, height: 8 },
            elevation: 8,
          }}
        >
          <View
            style={{
              position: 'absolute',
              bottom: -6,
              left: arrowLeft,
              width: 12,
              height: 12,
              backgroundColor: colors.surface,
              borderRightWidth: 1,
              borderBottomWidth: 1,
              borderColor: colors.border,
              transform: [{ rotate: '45deg' }],
            }}
          />
          <Text style={{ fontFamily: typography.fontBodyMedium, fontSize: typography.size.body, color: colors.textPrimary }}>
            {coach.title}
          </Text>
          <Text style={{ fontFamily: typography.fontBody, fontSize: typography.size.footnote, color: colors.textMuted, lineHeight: 18, marginTop: 3 }}>
            {coach.body}
          </Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: spacing.md }}>
            <Pressable onPress={finishCoach} hitSlop={10}>
              <Text style={{ fontFamily: typography.fontBodyMedium, fontSize: typography.size.footnote, color: colors.textMuted }}>Atla</Text>
            </Pressable>
            <Pressable onPress={nextCoachStep} hitSlop={10}>
              <Text style={{ fontFamily: typography.fontBodyMedium, fontSize: typography.size.footnote, color: colors.accent }}>
                {coachStep === COACH_STEPS.length - 1 ? 'Bitti' : 'Sıradaki'}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    ) : null}
    </View>
  );
}
