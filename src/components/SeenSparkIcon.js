// SeenSparkIcon — Vayb'a özgün mesaj durumu işareti (çift tik yerine "parıltı").
// seen=false → soluk kontur kıvılcım ("İletildi")
// seen=true  → dolu, hafif ışıldayan şeftali kıvılcım ("Görüldü")

import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function SeenSparkIcon({ size = 13, seen = false, accent, muted }) {
  return (
    <View
      style={{
        alignItems: 'center',
        justifyContent: 'center',
        shadowColor: seen ? accent : 'transparent',
        shadowOpacity: seen ? 0.5 : 0,
        shadowRadius: seen ? 5 : 0,
        shadowOffset: { width: 0, height: 0 },
      }}
    >
      <Ionicons name={seen ? 'sparkles' : 'sparkles-outline'} size={size} color={seen ? accent : muted} />
    </View>
  );
}
