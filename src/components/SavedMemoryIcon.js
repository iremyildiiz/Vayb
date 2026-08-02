// SavedMemoryIcon — Seçtiklerim için çift kaydetme işareti.

import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function SavedMemoryIcon({ size = 22, color, active = false }) {
  return (
    <View
      style={{
        width: size + 2,
        height: size + 2,
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: active ? color : 'transparent',
        shadowOpacity: active ? 0.35 : 0,
        shadowRadius: active ? 8 : 0,
        shadowOffset: { width: 0, height: 0 },
      }}
    >
      <Ionicons name="bookmarks-outline" size={size} color={color} />
    </View>
  );
}
