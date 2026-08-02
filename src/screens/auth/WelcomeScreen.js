// WelcomeScreen — Auth akışının karşılama ekranı.
// Marka + felsefe cümlesi + "Hesap oluştur" / "Giriş yap".

import { Image, View, Text } from 'react-native';
import Screen from '../../components/Screen';
import GradientButton from '../../components/GradientButton';
import { useTheme } from '../../context/ThemeContext';

const welcomeMark = require('../../../assets/vayb-welcome-mark.png');

export default function WelcomeScreen({ navigation }) {
  const { theme } = useTheme();
  const { colors, typography, spacing } = theme;

  return (
    <Screen style={{ justifyContent: 'space-between' }}>
      {/* üst: marka kimliği */}
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <View
          style={{
            width: 170,
            height: 170,
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: spacing.xl,
          }}
        >
          <View
            style={{
              position: 'absolute',
              width: 170,
              height: 170,
              borderRadius: 85,
              backgroundColor: 'rgba(255, 196, 150, 0.12)',
            }}
          />
          <View
            style={{
              position: 'absolute',
              width: 132,
              height: 132,
              borderRadius: 66,
              backgroundColor: 'rgba(255, 170, 130, 0.12)',
            }}
          />
          <View
            style={{
              width: 128,
              height: 128,
              borderRadius: 64,
              overflow: 'hidden',
              shadowColor: colors.accent,
              shadowOpacity: 0.18,
              shadowRadius: 22,
              shadowOffset: { width: 0, height: 12 },
            }}
          >
            <Image
              source={welcomeMark}
              resizeMode="cover"
              style={{
                width: 128,
                height: 128,
              }}
            />
          </View>
        </View>

        <Text style={{
  fontFamily: 'Outfit-Bold', // veya PlusJakartaSans-ExtraBold
  fontWeight: '700',
  fontSize: typography.size.display, // Örn: 40-48 arası harika durur
  color: colors.textPrimary,
  letterSpacing: -1, // Kalın fontlarda aralığı biraz daha daraltmak logomsu bir etki verir
}}>
          Vayb
        </Text>
        <Text
          style={{
            fontFamily: 'PlusJakartaSans-Regular',
            fontSize: 13,
            color: colors.textMuted,
            textAlign: 'center',
            marginTop: spacing.md,
            maxWidth: 280,
            lineHeight: 20,
          }}
        >
          Vaybını yansıt: Manzaranı, sıcak bir kahveni, doğru ışığını ya da sadece hissettiğin o küçük anı paylaş.
        </Text>
      </View>

      {/* alt: aksiyonlar */}
      <View style={{ gap: spacing.md, paddingBottom: spacing.xxl + spacing.lg }}>
        <GradientButton label="Giriş yap" onPress={() => navigation.navigate('Login')} />
        <GradientButton label="Hesap oluştur" variant="ghost" onPress={() => navigation.navigate('Register')} />
      </View>
    </Screen>
  );
}
