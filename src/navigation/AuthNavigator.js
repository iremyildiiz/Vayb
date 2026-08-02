// AuthNavigator — giriş yapılmamışken gösterilen stack.
// Karşılama → Giriş / Kayıt.

import { createNativeStackNavigator } from '@react-navigation/native-stack';
import WelcomeScreen from '../screens/auth/WelcomeScreen';
import LoginScreen from '../screens/auth/LoginScreen';
import RegisterScreen from '../screens/auth/RegisterScreen';
import ForgotPasswordScreen from '../screens/auth/ForgotPasswordScreen';
import LegalScreen from '../screens/LegalScreen';

const Stack = createNativeStackNavigator();

export default function AuthNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
      <Stack.Screen name="Welcome" component={WelcomeScreen} />
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="Register" component={RegisterScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      <Stack.Screen name="PrivacyPolicy" component={LegalScreen} initialParams={{ kind: 'privacy' }} />
      <Stack.Screen name="Terms" component={LegalScreen} initialParams={{ kind: 'terms' }} />
    </Stack.Navigator>
  );
}
