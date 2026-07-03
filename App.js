import 'react-native-url-polyfill/auto';
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import AppNavigator from './src/navigation/AppNavigator';

import { HealthProvider } from './src/context/HealthContext';
import { AuthProvider } from './src/context/AuthContext';
import { SubscriptionProvider } from './src/context/SubscriptionContext';

export default function App() {
  return (
    <AuthProvider>
      <SubscriptionProvider>
        <HealthProvider>
          <GestureHandlerRootView style={{ flex: 1 }}>
            <NavigationContainer>
              <StatusBar style="auto" />
              <AppNavigator />
            </NavigationContainer>
          </GestureHandlerRootView>
        </HealthProvider>
      </SubscriptionProvider>
    </AuthProvider>
  );
}
