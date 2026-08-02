// SearchScreen — username ile prefix arama (Faz 6A).

import { useState, useRef } from 'react';
import { View, Text, Image, Pressable, FlatList, TextInput, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import Screen from '../components/Screen';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { searchUsers } from '../services/users';

export default function SearchScreen({ navigation }) {
  const { theme } = useTheme();
  const { colors, typography, spacing, radius, gradients } = theme;
  const { user } = useAuth();

  const [q, setQ] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
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
        setResults(res.filter((u) => u.id !== user.uid)); // kendimi listeleme
      } catch (e) {
        setResults([]);
      } finally {
        setLoading(false);
        setSearched(true);
      }
    }, 300);
  };

  const renderItem = ({ item }) => {
    const uname = item.username || item.displayName || 'vayb kullanıcısı';
    const initial = (item.username || item.displayName || '?').trim().charAt(0).toUpperCase() || '?';
    return (
      <Pressable
        onPress={() => navigation.navigate('UserProfile', { uid: item.id })}
        style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md, opacity: pressed ? 0.6 : 1 })}
      >
        {item.photoURL ? (
          <Image source={{ uri: item.photoURL }} style={{ width: 44, height: 44, borderRadius: radius.pill }} />
        ) : (
          <LinearGradient colors={gradients.sunset} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={{ width: 44, height: 44, borderRadius: radius.pill, alignItems: 'center', justifyContent: 'center' }}>
            <Text style={{ fontFamily: typography.fontDisplay, fontSize: typography.size.body, color: '#FFFFFF' }}>{initial}</Text>
          </LinearGradient>
        )}
        <View style={{ marginLeft: spacing.md, flex: 1 }}>
          <Text numberOfLines={1} style={{ fontFamily: typography.fontBodyMedium, fontSize: typography.size.body, color: colors.textPrimary }}>
            {uname}
          </Text>
          {item.displayName && item.username ? (
            <Text numberOfLines={1} style={{ fontFamily: typography.fontBody, fontSize: typography.size.caption, color: colors.textMuted }}>
              {item.displayName}
            </Text>
          ) : null}
        </View>
        {item.isPrivate ? <Ionicons name="lock-closed" size={14} color={colors.textMuted} /> : null}
      </Pressable>
    );
  };

  return (
    <Screen padded={false}>
      {/* Üst bar + arama kutusu */}
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: spacing.lg, paddingBottom: spacing.md }}>
        <Pressable onPress={() => navigation.goBack()} hitSlop={8} style={{ marginRight: spacing.sm }}>
          <Ionicons name="chevron-back" size={26} color={colors.textPrimary} />
        </Pressable>
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: radius.input, paddingHorizontal: spacing.md }}>
          <Ionicons name="search" size={18} color={colors.textMuted} />
          <TextInput
            value={q}
            onChangeText={runSearch}
            placeholder="Kullanıcı adı ara"
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
          keyExtractor={(it) => it.id}
          renderItem={renderItem}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingHorizontal: spacing.xl, flexGrow: 1 }}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingTop: spacing.xxl * 1.5 }}>
              <Ionicons name={searched ? 'sad-outline' : 'search-outline'} size={40} color={colors.textMuted} />
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
