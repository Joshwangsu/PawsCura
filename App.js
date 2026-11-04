import './src/polyfill';
import React, { useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useFonts } from 'expo-font';
import AppNavigator from './src/navigation/AppNavigator';
import SplashScreen from './src/screens/SplashScreen';

import { HealthProvider } from './src/context/HealthContext';
import { AuthProvider } from './src/context/AuthContext';
import { SubscriptionProvider } from './src/context/SubscriptionContext';

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [fontsLoaded] = useFonts({
    PublicSans_300Light: require('./assets/fonts/PublicSans_300Light.ttf'),
    PublicSans_400Regular: require('./assets/fonts/PublicSans_400Regular.ttf'),
    PublicSans_500Medium: require('./assets/fonts/PublicSans_500Medium.ttf'),
    PublicSans_600SemiBold: require('./assets/fonts/PublicSans_600SemiBold.ttf'),
    PublicSans_700Bold: require('./assets/fonts/PublicSans_700Bold.ttf'),
    PublicSans_800ExtraBold: require('./assets/fonts/PublicSans_800ExtraBold.ttf'),
  });

  if (!fontsLoaded) {
    return null;
  }

  return (
    <AuthProvider>
      <SubscriptionProvider>
        <HealthProvider>
          <GestureHandlerRootView style={{ flex: 1 }}>
            {showSplash && <SplashScreen onFinish={() => setShowSplash(false)} />}
            <NavigationContainer>
              <StatusBar style="light" />
              <AppNavigator />
            </NavigationContainer>
          </GestureHandlerRootView>
        </HealthProvider>
      </SubscriptionProvider>
    </AuthProvider>
  );
}
