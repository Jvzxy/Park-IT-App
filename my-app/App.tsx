import React from 'react';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';

// Main Screens
import LoginScreen from './src/screens/User/LoginScreen';
import HomeScreen from './src/screens/User/HomeScreen';
import MapScreen from './src/screens/User/MapScreen';
import NotificationScreen from './src/screens/User/NotificationScreen';
import ProfileScreen from './src/screens/User/ProfileScreen';
import ReportScreen from './src/screens/User/ReportScreen';

// Sub-Screens
import ForgotPasswordScreen from './src/screens/User/ForgotPasswordScreen';
import ReportHistoryScreen from './src/screens/User/ReportHistoryScreen';
import EditProfileScreen from './src/screens/User/EditProfileScreen';
import ChangePasswordScreen from './src/screens/User/ChangePasswordScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const MyTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: '#0B1120',
  },
};

function MainTabs() {
  const insets = useSafeAreaInsets();

  return (
    <Tab.Navigator
      initialRouteName="HOME"
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: '#0B1120',
          borderTopColor: '#1e293b',
          height: 60 + insets.bottom, 
          paddingBottom: insets.bottom > 0 ? insets.bottom : 10,
          paddingTop: 10,
        },
        tabBarActiveTintColor: '#fbbf24',
        tabBarInactiveTintColor: '#f8fafc',
        tabBarIcon: ({ focused, color }) => {
          let iconName: any;
          if (route.name === 'HOME') iconName = focused ? 'home' : 'home-outline';
          else if (route.name === 'MAP') iconName = focused ? 'map' : 'map-outline';
          else if (route.name === 'NOTIFICATION') iconName = focused ? 'notifications' : 'notifications-outline';
          else if (route.name === 'PROFILE') iconName = focused ? 'person' : 'person-outline';

          if (!iconName) return null;
          return <Ionicons name={iconName} size={24} color={color} />;
        },
      })}
    >
      <Tab.Screen name="HOME" component={HomeScreen} />
      <Tab.Screen name="MAP" component={MapScreen} />
      <Tab.Screen name="REPORT" component={ReportScreen} options={{ tabBarButton: () => null }} />
      <Tab.Screen name="NOTIFICATION" component={NotificationScreen} />
      <Tab.Screen name="PROFILE" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer theme={MyTheme}>
        <Stack.Navigator initialRouteName="Login" screenOptions={{ headerShown: false }}>
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
          <Stack.Screen name="MainTabs" component={MainTabs} />
          <Stack.Screen name="ReportHistory" component={ReportHistoryScreen} />
          <Stack.Screen name="EditProfile" component={EditProfileScreen} />
          <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}