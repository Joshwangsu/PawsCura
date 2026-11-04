import React, { useState, useEffect } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import HomeScreen from '../screens/HomeScreen';
import PetsScreen from '../screens/PetsScreen';
import ScanScreen from '../screens/ScanScreen';
import ClinicScreen from '../screens/ClinicScreen';
import HistoryScreen from '../screens/HistoryScreen';
import DraggableChatbot from '../components/DraggableChatbot';
import { Colors, Shadows } from '../theme/colors';

const Tab = createBottomTabNavigator();

const TAB_ICONS = {
  Home: { active: 'home', inactive: 'home-outline' },
  Pets: { active: 'paw', inactive: 'paw' },
  Scan: { active: 'scan', inactive: 'scan-outline' },
  Clinics: { active: 'location', inactive: 'location' },
  Records: { active: 'document-text', inactive: 'document-text' },
};

function CustomPillTabBar({ state, descriptors, navigation, onHiddenChange }) {
  const insets = useSafeAreaInsets();
  const focusedRoute = state.routes[state.index];
  const focusedOptions = descriptors[focusedRoute.key]?.options;
  const isHidden = focusedOptions?.tabBarStyle?.display === 'none';

  useEffect(() => {
    if (onHiddenChange) {
      onHiddenChange(isHidden);
    }
  }, [isHidden, onHiddenChange]);

  if (isHidden) {
    return null;
  }

  return (
    <View
      pointerEvents="box-none"
      style={[
        styles.outerWrapper,
        { paddingBottom: Math.max(insets.bottom, 14) },
      ]}
    >
      <View style={styles.pillContainer}>
        {state.routes.map((route, index) => {
          const isFocused = state.index === index;
          const isScan = route.name === 'Scan';

          const onPress = () => {
            const event = navigation.emit({
              type: 'tabPress',
              target: route.key,
              canPreventDefault: true,
            });

            if (!isFocused && !event.defaultPrevented) {
              navigation.navigate(route.name);
            }
          };

          if (isScan) {
            return (
              <TouchableOpacity
                key={route.key}
                accessibilityRole="button"
                accessibilityState={isFocused ? { selected: true } : {}}
                onPress={onPress}
                activeOpacity={0.85}
                style={styles.centerBtnWrapper}
              >
                <View
                  style={[
                    styles.centerScanCircle,
                    isFocused && styles.centerScanCircleActive,
                  ]}
                >
                  <Ionicons
                    name="scan"
                    size={24}
                    color="#302B29"
                  />
                </View>
              </TouchableOpacity>
            );
          }

          const iconConfig = TAB_ICONS[route.name] || {
            active: 'ellipse',
            inactive: 'ellipse-outline',
          };

          return (
            <TouchableOpacity
              key={route.key}
              accessibilityRole="button"
              accessibilityState={isFocused ? { selected: true } : {}}
              onPress={onPress}
              activeOpacity={0.75}
              style={styles.tabButton}
            >
              <Ionicons
                name={isFocused ? iconConfig.active : iconConfig.inactive}
                size={23}
                color={isFocused ? '#D88D59' : '#FFF8F1'}
              />
              <View
                style={[
                  styles.activeDot,
                  { opacity: isFocused ? 1 : 0 },
                ]}
              />
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

export default function BottomTabNavigator() {
  const [isTabBarHidden, setIsTabBarHidden] = useState(false);

  return (
    <View style={{ flex: 1, backgroundColor: Colors.background }}>
      <Tab.Navigator
        tabBar={(props) => (
          <CustomPillTabBar
            {...props}
            onHiddenChange={setIsTabBarHidden}
          />
        )}
        screenOptions={{
          headerShown: false,
        }}
      >
        <Tab.Screen name="Home" component={HomeScreen} />
        <Tab.Screen name="Pets" component={PetsScreen} />
        <Tab.Screen name="Scan" component={ScanScreen} />
        <Tab.Screen name="Clinics" component={ClinicScreen} />
        <Tab.Screen name="Records" component={HistoryScreen} />
      </Tab.Navigator>

      {/* Global Floating Chatbot Button (hidden when fullscreen modal workflow is active) */}
      {!isTabBarHidden && <DraggableChatbot />}
    </View>
  );
}

const styles = StyleSheet.create({
  outerWrapper: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  pillContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    backgroundColor: '#302B29',
    height: 68,
    borderRadius: 34,
    paddingHorizontal: 12,
    ...Shadows.lg,
  },
  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    paddingTop: 6,
  },
  activeDot: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: '#FFF8F1',
    marginTop: 5,
  },
  centerBtnWrapper: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  centerScanCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#D88D59',
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.md,
  },
  centerScanCircleActive: {
    backgroundColor: '#F3D9BF',
  },
});
