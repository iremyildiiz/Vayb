import { useEffect, useRef } from 'react';
import { Animated, Easing, Image, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

const logo = require('../../assets/vayb-splash-mark-transparent.png');
const splashGradient = ['#FFB05F', '#FF7A32', '#FF5B2E'];

export default function LaunchAnimation({ onDone }) {
  const spin = useRef(new Animated.Value(0)).current;
  const glow = useRef(new Animated.Value(0)).current;
  const logoScale = useRef(new Animated.Value(0.92)).current;
  const logoLift = useRef(new Animated.Value(10)).current;
  const fade = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(spin, {
          toValue: 1,
          duration: 1250,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.sequence([
          Animated.timing(glow, {
            toValue: 1,
            duration: 520,
            easing: Easing.out(Easing.quad),
            useNativeDriver: true,
          }),
          Animated.timing(glow, {
            toValue: 0.55,
            duration: 520,
            easing: Easing.inOut(Easing.quad),
            useNativeDriver: true,
          }),
        ]),
        Animated.spring(logoScale, {
          toValue: 1,
          friction: 7,
          tension: 72,
          useNativeDriver: true,
        }),
        Animated.timing(logoLift, {
          toValue: 0,
          duration: 900,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]),
      Animated.timing(fade, {
        toValue: 0,
        duration: 280,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ]).start(() => onDone?.());
  }, [fade, glow, logoLift, logoScale, onDone, spin]);

  const rotate = spin.interpolate({
    inputRange: [0, 1],
    outputRange: ['-18deg', '342deg'],
  });

  const pulseScale = glow.interpolate({
    inputRange: [0, 1],
    outputRange: [0.82, 1.08],
  });

  return (
    <Animated.View pointerEvents="none" style={[styles.overlay, { opacity: fade }]}>
      <LinearGradient
        colors={splashGradient}
        start={{ x: 0.12, y: 0 }}
        end={{ x: 0.92, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <Animated.View style={[styles.markWrap, { transform: [{ translateY: logoLift }, { scale: logoScale }] }]}>
        <Animated.View style={[styles.glow, { opacity: glow, transform: [{ scale: pulseScale }] }]} />
        <Image source={logo} style={styles.logo} resizeMode="cover" />
        <Animated.View style={[styles.spiral, { transform: [{ rotate }] }]}>
          <View style={[styles.arc, styles.arcLarge]} />
          <View style={[styles.arc, styles.arcMid]} />
          <View style={[styles.arc, styles.arcSmall]} />
          <View style={styles.sunCore} />
        </Animated.View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
  },
  markWrap: {
    width: 238,
    height: 238,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glow: {
    position: 'absolute',
    width: 190,
    height: 190,
    borderRadius: 95,
    backgroundColor: 'rgba(255, 229, 176, 0.42)',
  },
  logo: {
    width: 230,
    height: 230,
  },
  spiral: {
    position: 'absolute',
    top: 50,
    right: 43,
    width: 62,
    height: 62,
    alignItems: 'center',
    justifyContent: 'center',
  },
  arc: {
    position: 'absolute',
    borderColor: 'rgba(255, 255, 255, 0.58)',
    borderLeftColor: 'transparent',
    borderBottomColor: 'transparent',
    borderRadius: 999,
  },
  arcLarge: {
    width: 52,
    height: 52,
    borderWidth: 4,
  },
  arcMid: {
    width: 34,
    height: 34,
    borderWidth: 3,
    transform: [{ rotate: '38deg' }],
  },
  arcSmall: {
    width: 16,
    height: 16,
    borderWidth: 3,
    transform: [{ rotate: '-18deg' }],
  },
  sunCore: {
    width: 6,
    height: 6,
    borderRadius: 999,
    backgroundColor: '#FFF8DD',
  },
});
