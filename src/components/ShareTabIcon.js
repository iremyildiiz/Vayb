// ShareTabIcon — "Paylaş" sekmesi için modern, zarif ikon.
// Yuvarlatılmış kare + ince artı ("gördüğünü paylaş / oluştur"). Aktif durumda
// nötr/şeftali (color prop = tabBarActiveTintColor), pembe DEĞİL.

import { View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function ShareTabIcon({ color, focused, size = 22 }) {
  const box = size + 4;
  return (
    <View
      style={{
        width: box,
        height: box,
        borderRadius: 9,
        borderWidth: focused ? 2 : 1.6,
        borderColor: color,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Ionicons name="add" size={size - 4} color={color} />
    </View>
  );
}
