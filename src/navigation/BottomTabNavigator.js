import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import HomeScreen from '../screens/HomeScreen';
import PetsScreen from '../screens/PetsScreen';
import ScanScreen from '../screens/ScanScreen';
import ClinicScreen from '../screens/ClinicScreen';
import SettingsScreen from '../screens/SettingsScreen';
import { Colors, Shadows } from '../theme/colors';

const Tab = createBottomTabNavigator();

function TabIcon({ name, focused, badge }) {
  return (
    <View style={styles.iconWrapper}>
      <Ionicons
        name={focused ? name : `${name}-outline`}
        size={24}
        color={focused ? Colors.tabActive : Colors.tabInactive}
      />
      {badge && (
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{badge}</Text>
        </View>
      )}
    </View>
  );
}

function ScanTabIcon({ focused }) {
  return (
    <View style={[
      styles.scanIconWrapper,
      focused && styles.scanIconWrapperActive,
    ]}>
      <Ionicons
        name={focused ? 'scan' : 'scan-outline'}
        size={26}
        color="#fff"
      />
    </View>
  );
}

import DraggableChatbot from '../components/DraggableChatbot';

export default function BottomTabNavigator() {
  return (
    <View style={{ flex: 1 }}>
      <Tab.Navigator
        screenOptions={{
          headerShown: false,
          tabBarStyle: styles.tabBar,
          tabBarActiveTintColor: Colors.tabActive,
          tabBarInactiveTintColor: Colors.tabInactive,
          tabBarLabelStyle: styles.tabLabel,
          tabBarItemStyle: styles.tabItem,
        }}
      >
        <Tab.Screen
          name="Home"
          component={HomeScreen}
          options={{
            tabBarLabel: 'Home',
            tabBarIcon: ({ focused }) => (
              <TabIcon name="home" focused={focused} />
            ),
          }}
        />
        <Tab.Screen
          name="Pets"
          component={PetsScreen}
          options={{
            tabBarLabel: 'Pets',
            tabBarIcon: ({ focused }) => (
              <TabIcon name="paw" focused={focused} />
            ),
          }}
        />
        <Tab.Screen
          name="Scan"
          component={ScanScreen}
          options={{
            tabBarLabel: 'Scan',
            tabBarIcon: ({ focused }) => <ScanTabIcon focused={focused} />,
            tabBarLabelStyle: {
              fontSize: 11,
              fontWeight: '700',
              color: Colors.primary,
              marginTop: 4,
            },
          }}
        />
        <Tab.Screen
          name="Clinics"
          component={ClinicScreen}
          options={{
            tabBarLabel: 'Clinics',
            tabBarIcon: ({ focused }) => (
              <TabIcon name="location" focused={focused} />
            ),
          }}
        />
        <Tab.Screen
          name="Settings"
          component={SettingsScreen}
          options={{
            tabBarLabel: 'Settings',
            tabBarIcon: ({ focused }) => (
              <TabIcon name="settings" focused={focused} />
            ),
          }}
        />
      </Tab.Navigator>
      
      {/* Global Floating Chatbot Button */}
      <DraggableChatbot />
    </View>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: Colors.tabBar,
    borderTopWidth: 0,
    height: 72,
    paddingBottom: 12,
    paddingTop: 8,
    ...Shadows.lg,
  },
  tabLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  tabItem: {
    paddingVertical: 4,
  },
  // Scan center button
  scanIconWrapper: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: Colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: -18,
    ...Shadows.md,
  },
  scanIconWrapperActive: {
    backgroundColor: Colors.primary,
  },
  iconWrapper: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  badge: {
    position: 'absolute',
    top: -4,
    right: -8,
    backgroundColor: Colors.danger,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: Colors.tabBar,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: '800',
    color: '#fff',
  },
});
