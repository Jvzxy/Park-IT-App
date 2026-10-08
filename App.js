import React from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons'; // Assuming Expo usage

// Import screens from your new src/screens/ folder
import HomeScreen from './src/screens/HomeScreen';
import MapScreen from './src/screens/MapScreen'; // Create placeholders for these
import NotificationScreen from './src/screens/NotificationScreen';
import ProfileScreen from './src/screens/ProfileScreen';

const Tab = createBottomTabNavigator();

const MyTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: '#0B1120',
  },
};

export default function App() {
  return (
    <NavigationContainer theme={MyTheme}>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          headerShown: false,
          tabBarStyle: {
            backgroundColor: '#0B1120',
            borderTopColor: '#1e293b',
            height: 70,
            paddingBottom: 10,
            paddingTop: 10,
          },
          tabBarActiveTintColor: '#fbbf24', // Yellow color for active tab
          tabBarInactiveTintColor: '#f8fafc',
          tabBarIcon: ({ focused, color, size }) => {
            let iconName;
            if (route.name === 'HOME') iconName = focused ? 'home' : 'home-outline';
            else if (route.name === 'MAP') iconName = focused ? 'map' : 'map-outline';
            else if (route.name === 'NOTIFICATION') iconName = focused ? 'notifications' : 'notifications-outline';
            else if (route.name === 'PROFILE') iconName = focused ? 'person' : 'person-outline';
            return <Ionicons name={iconName} size={24} color={color} />;
          },
        })}
      >
        <Tab.Screen name="HOME" component={HomeScreen} />
        <Tab.Screen name="MAP" component={MapScreen} />
        <Tab.Screen name="NOTIFICATION" component={NotificationScreen} />
        <Tab.Screen name="PROFILE" component={ProfileScreen} />
      </Tab.Navigator>
    </NavigationContainer>
  );
}