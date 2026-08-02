// MessagesIcon — Vayb'a özgün DM/sohbet ikonu.
// Yuvarlatılmış konuşma balonu + içinde küçük şeftali "parıltı".
// (Instagram paper-plane, Pinterest/TikTok yuvarlak balon DEĞİL.)

import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function MessagesIcon({ size = 25, color = '#111', spark = '#FF7A5C' }) {
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Ionicons name="chatbox-outline" size={size} color={color} />
      <Ionicons
        name="sparkles"
        size={size * 0.4}
        color={spark}
        style={{ position: 'absolute', top: size * 0.22 }}
      />
    </View>
  );
}
