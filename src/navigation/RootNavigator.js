// RootNavigator — NavigationContainer + oturum durumuna göre yönlendirme.
// Giriş yoksa Auth stack, varsa ana sekmeler. İleride detay ekranları
// (gönderi detayı, başka profil, ayarlar) Main tarafına eklenecek.

import { View, ActivityIndicator } from 'react-native';
import { NavigationContainer, DefaultTheme, DarkTheme } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import TabNavigator from './TabNavigator';
import AuthNavigator from './AuthNavigator';
import VerifyEmailScreen from '../screens/auth/VerifyEmailScreen';
import ProfileScreen from '../screens/ProfileScreen';
import SearchScreen from '../screens/SearchScreen';
import PostDetailScreen from '../screens/PostDetailScreen';
import SettingsScreen from '../screens/SettingsScreen';
import AccountSettingsScreen from '../screens/AccountSettingsScreen';
import SelectedPostsScreen from '../screens/SelectedPostsScreen';
import ArchivedPostsScreen from '../screens/ArchivedPostsScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import ReactionDetailScreen from '../screens/ReactionDetailScreen';
import PariltiDetailScreen from '../screens/PariltiDetailScreen';
import ConversationsScreen from '../screens/ConversationsScreen';
import ChatScreen from '../screens/ChatScreen';
import NewChatScreen from '../screens/NewChatScreen';
import UserListScreen from '../screens/UserListScreen';
import LegalScreen from '../screens/LegalScreen';
import BlockedUsersScreen from '../screens/BlockedUsersScreen';

const Stack = createNativeStackNavigator();

export default function RootNavigator() {
  const { theme, isDark } = useTheme();
  const { user, initializing, emailVerified } = useAuth();

  // React Navigation'ın kendi temasını Vayb renklerine bağla
  // (ekran geçişlerinde beyaz/siyah çakması olmasın).
  const base = isDark ? DarkTheme : DefaultTheme;
  const navTheme = {
    ...base,
    colors: {
      ...base.colors,
      background: theme.colors.bg,
      card: theme.colors.surface,
      text: theme.colors.textPrimary,
      border: theme.colors.border,
      primary: theme.colors.accent,
    },
  };

  // Oturum kontrol edilirken (AsyncStorage'dan) temalı bekleme.
  if (initializing) {
    return (
      <View style={{ flex: 1, backgroundColor: theme.colors.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={theme.colors.accent} />
      </View>
    );
  }

  return (
    <NavigationContainer theme={navTheme}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user && !emailVerified ? (
          <Stack.Screen name="VerifyEmail" component={VerifyEmailScreen} />
        ) : user ? (
          <Stack.Group>
            <Stack.Screen name="Main" component={TabNavigator} />
            {/* Tab'ların üstüne push edilen ekranlar */}
            <Stack.Screen name="UserProfile" component={ProfileScreen} />
            <Stack.Screen name="Search" component={SearchScreen} />
            <Stack.Screen name="Notifications" component={NotificationsScreen} />
            <Stack.Screen name="PostDetail" component={PostDetailScreen} />
            <Stack.Screen name="ReactionDetail" component={ReactionDetailScreen} />
            <Stack.Screen name="PariltiDetail" component={PariltiDetailScreen} />
            <Stack.Screen name="Conversations" component={ConversationsScreen} />
            <Stack.Screen name="Chat" component={ChatScreen} />
            <Stack.Screen name="NewChat" component={NewChatScreen} />
            <Stack.Screen name="UserList" component={UserListScreen} />
            <Stack.Screen name="Settings" component={SettingsScreen} />
            <Stack.Screen name="AccountSettings" component={AccountSettingsScreen} />
            <Stack.Screen name="PrivacyPolicy" component={LegalScreen} initialParams={{ kind: 'privacy' }} />
            <Stack.Screen name="Terms" component={LegalScreen} initialParams={{ kind: 'terms' }} />
            <Stack.Screen name="BlockedUsers" component={BlockedUsersScreen} />
            <Stack.Screen name="SelectedPosts" component={SelectedPostsScreen} />
            <Stack.Screen name="ArchivedPosts" component={ArchivedPostsScreen} />
          </Stack.Group>
        ) : (
          <Stack.Screen name="Auth" component={AuthNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
