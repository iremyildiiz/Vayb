// SettingsDrawer — profildeki menü ikonundan açılan sağ yan çubuk.
// Tema anahtarı (güneş/ay, yazısız on/off) + Ayarlar (placeholder) + Çıkış.
// Absolute overlay + Animated ile — react-navigation/drawer veya gesture-handler GEREKMEZ
// (yeni native bağımlılık yok, mevcut build'i bozmaz).

import { useEffect, useRef, useState } from 'react';
import { View, Text, Pressable, Switch, Animated, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import SavedMemoryIcon from './SavedMemoryIcon';

export default function SettingsDrawer({ visible, onClose }) {
  const { theme, isDark, toggleTheme } = useTheme();
  const { signOut } = useAuth();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { colors, typography, spacing, radius } = theme;

  const PANEL_W = Math.min(320, width * 0.8);
  const slide = useRef(new Animated.Value(PANEL_W)).current;
  const [mounted, setMounted] = useState(visible);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      Animated.timing(slide, { toValue: 0, duration: 220, useNativeDriver: true }).start();
    } else {
      Animated.timing(slide, { toValue: PANEL_W, duration: 200, useNativeDriver: true }).start(({ finished }) => {
        if (finished) setMounted(false);
      });
    }
  }, [visible, PANEL_W, slide]);

  if (!mounted) return null;

  const Row = ({ icon, iconNode, label, onPress, danger }) => (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({ flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md, opacity: pressed ? 0.6 : 1 })}
    >
      {iconNode || <Ionicons name={icon} size={20} color={danger ? colors.textPrimary : colors.textMuted} />}
      <Text style={{ marginLeft: spacing.md, fontFamily: typography.fontBodyMedium, fontSize: typography.size.body, color: colors.textPrimary }}>
        {label}
      </Text>
    </Pressable>
  );

  return (
    <View
      style={{
        position: 'absolute',
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
        zIndex: 50,
        elevation: 50,
      }}
      pointerEvents="box-none"
    >
      {/* Arka plan — dokununca kapanır */}
      <Pressable onPress={onClose} style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.35)', flexDirection: 'row', justifyContent: 'flex-end' }}>
        {/* Panel — içine dokununca kapanmaz */}
        <Animated.View style={{ transform: [{ translateX: slide }] }}>
          <Pressable
            onPress={() => {}}
            style={{
              width: PANEL_W,
              height: '100%',
              backgroundColor: colors.bg,
              borderLeftWidth: 1,
              borderLeftColor: colors.border,
              paddingTop: insets.top + spacing.lg,
              paddingBottom: insets.bottom + spacing.lg,
              paddingHorizontal: spacing.xl,
            }}
          >
            {/* Başlık + kapat */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.lg }}>
              <Text style={{ flex: 1, fontFamily: typography.fontDisplay, fontSize: typography.size.title, color: colors.textPrimary }}>
                Menü
              </Text>
              <Pressable onPress={onClose} hitSlop={8}>
                <Ionicons name="close" size={24} color={colors.textMuted} />
              </Pressable>
            </View>

            {/* Tema — güneş/ay, yazısız on/off */}
            <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: spacing.md }}>
              <Ionicons name={isDark ? 'sunny-outline' : 'moon-outline'} size={20} color={colors.textMuted} />
              <View style={{ flex: 1 }} />
              <Switch
                value={isDark}
                onValueChange={toggleTheme}
                trackColor={{ true: colors.orange, false: colors.border }}
                thumbColor="#FFFFFF"
                ios_backgroundColor={colors.border}
              />
            </View>

            <View style={{ height: 1, backgroundColor: colors.border, marginVertical: spacing.xs }} />

            <Row iconNode={<SavedMemoryIcon size={20} color={colors.textMuted} />} label="Seçtiklerim" onPress={() => { onClose?.(); navigation.navigate('SelectedPosts'); }} />
            <Row icon="ban-outline" label="Engellediklerim" onPress={() => { onClose?.(); navigation.navigate('BlockedUsers'); }} />
            <Row icon="settings-outline" label="Ayarlar" onPress={() => { onClose?.(); navigation.navigate('Settings'); }} />

            {/* Alt: Çıkış */}
            <View style={{ flex: 1 }} />
            <View style={{ height: 1, backgroundColor: colors.border, marginBottom: spacing.xs }} />
            <Row icon="log-out-outline" label="Çıkış yap" onPress={() => { onClose?.(); signOut(); }} danger />
          </Pressable>
        </Animated.View>
      </Pressable>
    </View>
  );
}
