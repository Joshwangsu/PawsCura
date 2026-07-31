import 'react-native-url-polyfill/auto';
import React, { useState } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import AppNavigator from './src/navigation/AppNavigator';
import SplashScreen from './src/screens/SplashScreen';

import { HealthProvider } from './src/context/HealthContext';
import { AuthProvider } from './src/context/AuthContext';
import { SubscriptionProvider } from './src/context/SubscriptionContext';

export default function App() {
  const [showSplash, setShowSplash] = useState(true);

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
