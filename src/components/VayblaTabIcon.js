// VayblaTabIcon — Vaybla için dört uçlu, zarif parıltı.

import { View } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';

export default function VayblaTabIcon({ focused, color, size = 22 }) {
  const { theme } = useTheme();
  const iconColor = focused ? theme.colors.accent : color;
  const stroke = Math.max(3, size * 0.15);

  const SparkLine = ({ top, left, right }) => (
    <View
      style={{
        position: 'absolute',
        top,
        left,
        right,
        width: size * 0.34,
        height: stroke,
        borderRadius: theme.radius.pill,
        backgroundColor: iconColor,
        transform: [{ rotate: '45deg' }],
      }}
    />
  );

  return (
    <View style={{ width: size + 4, height: size + 4, alignItems: 'center', justifyContent: 'center' }}>
      <MaterialCommunityIcons name="star-four-points-outline" size={size + 3} color={iconColor} />
      <SparkLine top={size * 0.1} left={0} />
      <SparkLine top={size * 0.74} right={1} />
    </View>
  );
}
