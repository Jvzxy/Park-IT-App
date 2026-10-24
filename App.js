
import React from 'react';
import {
  NavigationContainer,
  DefaultTheme,
} from '@react-navigation/native';

import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';

import LoginScreen from './src/screens/LoginScreen';
import HomeScreen from './src/screens/HomeScreen';
import MapScreen from './src/screens/MapScreen';
import NotificationScreen from './src/screens/NotificationScreen';
import ProfileScreen from './src/screens/ProfileScreen';
import ReportScreen from './src/screens/ReportScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const MyTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: '#0B1120',
  },
};

// Main application tabs
function MainTabs() {
  return (
    <Tab.Navigator
      initialRouteName="HOME"
      screenOptions={({ route }) => ({
        headerShown: false,

        tabBarStyle: {
          backgroundColor: '#0B1120',
          borderTopColor: '#1e293b',
          height: 70,
          paddingBottom: 10,
          paddingTop: 10,
        },

        tabBarActiveTintColor: '#fbbf24',
        tabBarInactiveTintColor: '#f8fafc',

        tabBarIcon: ({ focused, color }) => {
          let iconName;

          if (route.name === 'HOME') {
            iconName = focused ? 'home' : 'home-outline';
          } else if (route.name === 'MAP') {
            iconName = focused ? 'map' : 'map-outline';
          } else if (route.name === 'NOTIFICATION') {
            iconName = focused
              ? 'notifications'
              : 'notifications-outline';
          } else if (route.name === 'PROFILE') {
            iconName = focused ? 'person' : 'person-outline';
          }

          if (!iconName) return null;

          return (
            <Ionicons
              name={iconName}
              size={24}
              color={color}
            />
          );
        },
      })}
    >
      <Tab.Screen name="HOME" component={HomeScreen} />
      <Tab.Screen name="MAP" component={MapScreen} />

      <Tab.Screen
        name="REPORT"
        component={ReportScreen}
        options={{
          tabBarButton: () => null,
        }}
      />

      <Tab.Screen
        name="NOTIFICATION"
        component={NotificationScreen}
      />

      <Tab.Screen
        name="PROFILE"
        component={ProfileScreen}
      />
    </Tab.Navigator>
  );
}

// App entry point: Login first, then the main application
export default function App() {
  return (
    <NavigationContainer theme={MyTheme}>
      <Stack.Navigator
        initialRouteName="Login"
        screenOptions={{
          headerShown: false,
        }}
      >
        <Stack.Screen
          name="Login"
          component={LoginScreen}
        />

        <Stack.Screen
          name="MainTabs"
          component={MainTabs}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
