// NewChatScreen — kullanıcı arayıp yeni sohbet başlatır.

import { useRef, useState } from 'react';
import { ActivityIndicator, Image, Pressable, FlatList, Text, TextInput, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../components/Screen';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { createOrGetConversation } from '../services/chats';
import { searchUsers } from '../services/users';

function displayUser(info) {
  if (!info) return 'vayb kullanıcısı';
  return info.username || info.displayName || 'vayb kullanıcısı';
}

export default function NewChatScreen({ navigation }) {
  const { theme } = useTheme();
  const { colors, typography, spacing, radius, gradients } = theme;
  const { user } = useAuth();

  const [q, setQ] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [opening, setOpening] = useState(null);
  const debounce = useRef(null);

  const runSearch = (text) => {
    setQ(text);
    if (debounce.current) clearTimeout(debounce.current);
    if (!text.trim()) {
      setResults([]);
      setSearched(false);
      return;
    }
    debounce.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await searchUsers(text);
        setResults(res.filter((item) => item.id !== user.uid));
      } catch (e) {
        setResults([]);
      } finally {
        setLoading(false);
        setSearched(true);
      }
    }, 250);
  };

  const openChat = async (otherUid) => {
    if (opening) return;
    setOpening(otherUid);
    try {
      const conversationId = await createOrGetConversation(otherUid);
      navigation.replace('Chat', { conversationId, otherUid });
    } catch (e) {
      console.warn('[chat] yeni sohbet açılamadı:', e?.code || e?.message);
      setOpening(null);
    }
  };

  const renderItem = ({ item }) => {
    const initial = displayUser(item).trim().charAt(0).toUpperCase() || '?';
    return (
      <Pressable
        onPress={() => openChat(item.id)}
        disabled={!!opening}
        style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md, opacity: pressed || opening === item.id ? 0.6 : 1 })}
      >
        {item.photoURL ? (
          <Image source={{ uri: item.photoURL }} style={{ width: 44, height: 44, borderRadius: radius.pill }} />
        ) : (
          <LinearGradient colors={gradients.sunset} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ width: 44, height: 44, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontFamily: typography.fontDisplay, fontSize: typography.size.body, color: '#FFFFFF' }}>{initial}</Text>
          </LinearGradient>
        )}
        <View style={{ flex: 1, marginLeft: spacing.md }}>
          <Text numberOfLines={1} style={{ fontFamily: typography.fontBodyMedium, fontSize: typography.size.body, color: colors.textPrimary }}>
            {displayUser(item)}
          </Text>
          {item.displayName && item.username ? (
            <Text numberOfLines={1} style={{ fontFamily: typography.fontBody, fontSize: typography.size.caption, color: colors.textMuted, marginTop: 2 }}>
              {item.displayName}
            </Text>
          ) : null}
        </View>
        {opening === item.id ? <ActivityIndicator color={colors.accent} /> : <Ionicons name="paper-plane-outline" size={18} color={colors.textMuted} />}
      </Pressable>
    );
  };

  return (
    <Screen padded={false}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingBottom: spacing.md }}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={8} style={{ marginRight: spacing.sm }}>
          <Ionicons name="chevron-back" size={26} color={colors.textPrimary} />
        </Pressable>
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.input, paddingHorizontal: spacing.md }}>
          <Ionicons name="search" size={18} color={colors.textMuted} />
          <TextInput
            value={q}
            onChangeText={runSearch}
            placeholder="Sohbet edeceğin kişiyi ara"
            placeholderTextColor={colors.textMuted}
            autoCapitalize="none"
            autoCorrect={false}
            autoFocus
            style={{ flex: 1, paddingVertical: spacing.sm, marginLeft: spacing.sm, fontFamily: typography.fontBody, fontSize: typography.size.body, color: colors.textPrimary }}
          />
        </View>
      </View>

      {loading ? (
        <View style={{ paddingTop: spacing.xl, alignItems: 'center' }}>
          <ActivityIndicator color={colors.accent} />
        </View>
      ) : (
        <FlatList
          data={results}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingHorizontal: spacing.xl, flexGrow: 1 }}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingTop: spacing.xxl * 1.5 }}>
              <Ionicons name={searched ? 'sad-outline' : 'paper-plane-outline'} size={40} color={colors.textMuted} />
              <Text style={{ fontFamily: typography.fontBody, fontSize: typography.size.footnote, color: colors.textMuted, marginTop: spacing.sm, textAlign: 'center' }}>
                {searched ? 'Kullanıcı bulunamadı.' : 'Bir kullanıcı adı yazmaya başla.'}
              </Text>
            </View>
          }
        />
      )}
    </Screen>
  );
}
