import './src/polyfill';
import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import AppNavigator from './src/navigation/AppNavigator';
import SplashScreen from './src/screens/SplashScreen';
import { AlertProvider } from './src/components/CustomAlert';

import { HealthProvider } from './src/context/HealthContext';
import { AuthProvider } from './src/context/AuthContext';
import { SubscriptionProvider } from './src/context/SubscriptionContext';

class AppErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error('AppErrorBoundary caught error:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <View style={ebStyles.container}>
          <Text style={ebStyles.title}>Something went wrong</Text>
          <Text style={ebStyles.message}>
            {this.state.error?.message || 'An unexpected error occurred.'}
          </Text>
          <TouchableOpacity
            style={ebStyles.btn}
            onPress={() => this.setState({ hasError: false, error: null })}
          >
            <Text style={ebStyles.btnText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      );
    }
    return this.props.children;
  }
}

const ebStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#FFF8F1',
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#302B29',
    marginBottom: 8,
  },
  message: {
    fontSize: 13,
    color: '#6E5B52',
    textAlign: 'center',
    marginBottom: 20,
  },
  btn: {
    backgroundColor: '#794B35',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  btnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
});

export default function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [fontsLoaded, fontError] = useFonts({
    PublicSans_300Light: require('./assets/fonts/PublicSans_300Light.ttf'),
    PublicSans_400Regular: require('./assets/fonts/PublicSans_400Regular.ttf'),
    PublicSans_500Medium: require('./assets/fonts/PublicSans_500Medium.ttf'),
    PublicSans_600SemiBold: require('./assets/fonts/PublicSans_600SemiBold.ttf'),
    PublicSans_700Bold: require('./assets/fonts/PublicSans_700Bold.ttf'),
    PublicSans_800ExtraBold: require('./assets/fonts/PublicSans_800ExtraBold.ttf'),
  });

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <AppErrorBoundary>
        <GestureHandlerRootView style={{ flex: 1 }}>
          <AlertProvider>
            <AuthProvider>
              <SubscriptionProvider>
                <HealthProvider>
                  <NavigationContainer>
                    <StatusBar style="light" />
                    <AppNavigator />
                  </NavigationContainer>
                  {showSplash && <SplashScreen onFinish={() => setShowSplash(false)} />}
                </HealthProvider>
              </SubscriptionProvider>
            </AuthProvider>
          </AlertProvider>
        </GestureHandlerRootView>
      </AppErrorBoundary>
    </SafeAreaProvider>
  );
}
