import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Text, View } from 'react-native';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import type { Session } from '@supabase/supabase-js';
import { supabase } from './src/screens/lib/supabase';

// Main Screens
import LoginScreen from './src/screens/User/LoginScreen';
import SignupScreen from './src/screens/User/SignupScreen';
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
import ResetPasswordScreen from './src/screens/User/ResetPasswordScreen';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

interface UserProfile {
  id: string;
  role: 'student' | 'guard' | 'admin';
  student_id: string | null;
  email: string;
  full_name: string | null;
  is_active: boolean;
}

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
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const handledUrls = new Set<string>();
    const handleUrl = async (url: string) => {
      if (handledUrls.has(url)) return;
      handledUrls.add(url);
      let parsedUrl: URL;
      try {
        parsedUrl = new URL(url);
      } catch {
        Alert.alert('Invalid reset link', 'Open the latest password reset email and try again.');
        return;
      }

      const hashParams = new URLSearchParams(parsedUrl.hash.replace(/^#/, ''));
      const type = hashParams.get('type') ?? parsedUrl.searchParams.get('type');
      if (type !== 'recovery') return;

      setIsPasswordRecovery(true);
      const tokenHash = parsedUrl.searchParams.get('token_hash') ?? hashParams.get('token_hash');
      const accessToken = hashParams.get('access_token');
      const refreshToken = hashParams.get('refresh_token');
      const { error } = tokenHash
        ? await supabase.auth.verifyOtp({ token_hash: tokenHash, type: 'recovery' })
        : accessToken && refreshToken
          ? await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken })
          : { error: new Error('The reset link is incomplete or expired.') };

      if (!isMounted) return;
      if (error) {
        setIsPasswordRecovery(false);
        Alert.alert('Unable to verify reset link', error.message);
      }
    };

    const linkSubscription = Linking.addEventListener('url', ({ url }) => {
      void handleUrl(url);
    });
    void Linking.getInitialURL().then((url) => {
      if (url) return handleUrl(url);
      return undefined;
    }).catch((error: unknown) => {
      if (isMounted) Alert.alert('Unable to open reset link', error instanceof Error ? error.message : 'Open the latest password reset email and try again.');
    });

    return () => {
      isMounted = false;
      linkSubscription.remove();
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadProfile = async (userId: string) => {
      const { data, error } = await supabase
        .from('users')
        .select('id, role, student_id, email, full_name, is_active')
        .eq('id', userId)
        .maybeSingle();

      if (!isMounted) return;
      if (error) {
        setProfileError(error.message);
        setProfile(null);
      } else if (!data || !data.is_active) {
        setProfileError('This account is unavailable. Contact a system administrator.');
        setProfile(null);
        await supabase.auth.signOut();
      } else {
        setProfileError(null);
        setProfile(data as UserProfile);
      }
      setIsLoading(false);
    };

    void supabase.auth.getSession().then(({ data, error }) => {
      if (!isMounted) return;
      if (error) setProfileError(error.message);
      const currentSession = data.session;
      setSession(currentSession);
      if (currentSession) {
        void loadProfile(currentSession.user.id);
      } else {
        setIsLoading(false);
      }
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      if (!isMounted) return;
      setSession(nextSession);
      if (!nextSession) {
        setProfile(null);
        setProfileError(null);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setTimeout(() => {
        if (isMounted) void loadProfile(nextSession.user.id);
      }, 0);
    });

    return () => {
      isMounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  if (isLoading) {
    return (
      <SafeAreaProvider>
        <View style={{ flex: 1, backgroundColor: '#0B1120', alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color="#fbbf24" />
        </View>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer theme={MyTheme}>
        <Stack.Navigator
          key={session ? `${profile?.role ?? 'profile-loading'}-${isPasswordRecovery ? 'password-reset' : 'normal'}` : 'signed-out'}
          initialRouteName={session ? (isPasswordRecovery ? 'PasswordReset' : profile?.role === 'student' ? 'MainTabs' : 'StaffAccess') : 'Login'}
          screenOptions={{ headerShown: false }}
        >
          {session && isPasswordRecovery ? (
            <Stack.Screen name="PasswordReset">
              {() => <ResetPasswordScreen onComplete={() => setIsPasswordRecovery(false)} />}
            </Stack.Screen>
          ) : !session ? (
            <>
              <Stack.Screen name="Login" component={LoginScreen} />
              <Stack.Screen name="Signup" component={SignupScreen} />
              <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
            </>
          ) : profile?.role === 'student' ? (
            <>
              <Stack.Screen name="MainTabs" component={MainTabs} />
              <Stack.Screen name="ReportHistory" component={ReportHistoryScreen} />
              <Stack.Screen name="EditProfile" component={EditProfileScreen} />
              <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} />
            </>
          ) : (
            <Stack.Screen name="StaffAccess">
              {() => (
                <View style={{ flex: 1, backgroundColor: '#0B1120', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
                  <Text style={{ color: '#fff', fontSize: 22, fontWeight: 'bold', marginBottom: 12 }}>
                    {profile?.role === 'admin' ? 'Administrator account' : profile?.role === 'guard' ? 'Guard account' : 'Account unavailable'}
                  </Text>
                  <Text style={{ color: '#94a3b8', textAlign: 'center' }}>
                    {profileError ?? 'Use the Park-IT web portal to access staff tools.'}
                  </Text>
                </View>
              )}
            </Stack.Screen>
          )}
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}