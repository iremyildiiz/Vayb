import { useCallback, useState } from 'react';
import { View, Pressable, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { getPendingRequests } from '../services/follows';
import { getUnreadNotificationCount } from '../services/notifications';

const wordmarkLight = require('../../assets/vayb-wordmark.png');
const wordmarkDark = require('../../assets/vayb-wordmark-dark.png');

export default function AppTopBar({
  navigation,
  title = 'Vayb',
  showSearch = true,
  showNotifications = true,
  showChat = false,
  unreadChats = 0,
}) {
  const { theme } = useTheme();
  const { colors, spacing, radius, isDark } = theme;
  const { user } = useAuth();
  const [notificationCount, setNotificationCount] = useState(0);

  useFocusEffect(useCallback(() => {
    let alive = true;
    (async () => {
      if (!user?.uid || !showNotifications) {
        setNotificationCount(0);
        return;
      }
      try {
        const [reqs, unread] = await Promise.all([
          getPendingRequests(user.uid),
          getUnreadNotificationCount(user.uid),
        ]);
        if (alive) setNotificationCount(reqs.length + unread);
      } catch (e) {
        if (alive) setNotificationCount(0);
      }
    })();
    return () => { alive = false; };
  }, [showNotifications, user?.uid]));

  const IconButton = ({ name, label, onPress, badgeCount = 0 }) => (
    <Pressable
      onPress={onPress}
      accessibilityLabel={label}
      hitSlop={8}
      style={{ width: 36, height: 36, alignItems: 'center', justifyContent: 'center', marginLeft: spacing.xs }}
    >
      <Ionicons name={name} size={25} color={colors.textPrimary} />
      {badgeCount > 0 ? (
        <View
          style={{
            position: 'absolute',
            top: 2,
            right: 1,
            minWidth: 8,
            height: 8,
            borderRadius: radius.pill,
            backgroundColor: colors.accent,
            borderWidth: 1,
            borderColor: colors.bg,
          }}
        />
      ) : null}
    </Pressable>
  );

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.xl, paddingBottom: spacing.md }}>
      <View style={{ flex: 1, height: 36, justifyContent: 'center' }}>
        <Image
          source={isDark ? wordmarkDark : wordmarkLight}
          accessibilityLabel={title}
          resizeMode="contain"
          style={{ width: 86, height: 30 }}
        />
      </View>
      {showSearch ? (
        <IconButton name="search" label="Ara" onPress={() => navigation.navigate('Search')} />
      ) : null}
      {showNotifications ? (
        <IconButton
          name="notifications-outline"
          label="Bildirimler"
          onPress={() => navigation.navigate('Notifications')}
          badgeCount={notificationCount}
          tintColor={colors.textPrimary}
        />
      ) : null}
      {showChat ? (
        <IconButton
          name="chatbubble-ellipses-outline"
          label="Sohbet"
          onPress={() => navigation.navigate('Conversations')}
          badgeCount={unreadChats}
        />
      ) : null}
    </View>
  );
}
