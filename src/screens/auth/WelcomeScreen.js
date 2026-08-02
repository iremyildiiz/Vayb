// WelcomeScreen — Auth akışının karşılama ekranı.
// Marka (logo karosu + hafif ışıma) + felsefe cümlesi + "Giriş yap" / "Hesap oluştur".

import { Image, View, Text } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Screen from '../../components/Screen';
import GradientButton from '../../components/GradientButton';
import { useTheme } from '../../context/ThemeContext';

const welcomeMark = require('../../../assets/vayb-welcome-mark.png');

export default function WelcomeScreen({ navigation }) {
  const { theme } = useTheme();
  const { colors, typography, spacing } = theme;

  return (
    <Screen style={{ justifyContent: 'space-between' }}>
      {/* üstte çok hafif gün batımı tonu */}
      <LinearGradient
        colors={['rgba(255,135,90,0.16)', 'rgba(255,196,140,0.05)', 'transparent']}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 340 }}
        pointerEvents="none"
      />

      {/* üst: marka kimliği */}
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <View style={{ alignItems: 'center', justifyContent: 'center', marginBottom: spacing.xl }}>
          {/* yumuşak ışıma halkaları */}
          <View style={{ position: 'absolute', width: 208, height: 208, borderRadius: 104, backgroundColor: 'rgba(255,135,90,0.06)' }} />
          <View style={{ position: 'absolute', width: 164, height: 164, borderRadius: 82, backgroundColor: 'rgba(255,135,90,0.08)' }} />
          {/* logo karosu (yuvarlatılmış kare, şeftali ışımalı gölge) */}
          <Image
            source={welcomeMark}
            resizeMode="cover"
            style={{
              width: 120,
              height: 120,
              borderRadius: 30,
              shadowColor: '#FF875A',
              shadowOpacity: 0.34,
              shadowRadius: 22,
              shadowOffset: { width: 0, height: 12 },
            }}
          />
        </View>

        <Text style={{ fontFamily: typography.fontDisplay, fontSize: typography.size.display, color: colors.textPrimary, letterSpacing: -0.5 }}>
          Vayb
        </Text>
        <Text
          style={{
            fontFamily: typography.fontBody,
            fontSize: typography.size.footnote,
            color: colors.textMuted,
            textAlign: 'center',
            marginTop: spacing.md,
            maxWidth: 280,
            lineHeight: 20,
          }}
        >
          Vaybını yansıt: manzaranı, sıcak bir kahveni, doğru ışığını ya da sadece hissettiğin o küçük anı paylaş.
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
