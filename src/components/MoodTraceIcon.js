// MoodTraceIcon — "vayb" (kısa duygu tepkisi) için spiralli iz ikonu.

import { View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

export default function MoodTraceIcon({ size = 18, color }) {
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <MaterialIcons name="cyclone" size={size + 2} color={color} />
    </View>
  );
}
