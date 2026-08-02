// ProfileTabIcon — alt menüdeki "Profil" sekmesi için, jenerik kişi ikonu yerine
// kullanıcının kendi profil fotoğrafının küçük yuvarlak hali (Instagram gibi).
// photoURL yoksa gün batımı gradyanlı placeholder avatar.

import { View, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';

export default function ProfileTabIcon({ focused, color, size = 26 }) {
  const { theme } = useTheme();
  const { profile } = useAuth();
  const photoURL = profile?.photoURL;

  // Odaklıyken nötr (pembe değil) ince bir çerçeve.
  const ring = focused ? { borderWidth: 2, borderColor: color } : { borderWidth: 2, borderColor: 'transparent' };

  return (
    <View style={[{ width: size + 4, height: size + 4, borderRadius: 999, alignItems: 'center', justifyContent: 'center' }, ring]}>
      {photoURL ? (
        <Image source={{ uri: photoURL }} style={{ width: size, height: size, borderRadius: 999 }} />
      ) : (
        <LinearGradient
          colors={theme.gradients.sunset}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ width: size, height: size, borderRadius: 999, alignItems: 'center', justifyContent: 'center' }}
        >
          <Ionicons name="person" size={size * 0.6} color="#FFFFFF" />
        </LinearGradient>
      )}
    </View>
  );
}
