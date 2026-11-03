import React, { useCallback, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { supabase } from '../lib/supabase';

interface UserNotification {
  id: number;
  message: string;
  is_read: boolean;
  created_at: string;
}

export default function NotificationScreen() {
  const [notifications, setNotifications] = useState<UserNotification[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadNotifications = useCallback(async () => {
    const { data, error } = await supabase
      .from('notifications')
      .select('id, message, is_read, created_at')
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) {
      setErrorMessage(error.message);
    } else {
      setErrorMessage(null);
      setNotifications(data ?? []);
    }
    setIsLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      setIsLoading(true);
      void loadNotifications();
    }, [loadNotifications]),
  );

  const markRead = async (id: number) => {
    const { error } = await supabase.from('notifications').update({ is_read: true }).eq('id', id);
    if (error) {
      setErrorMessage(error.message);
      return;
    }
    setNotifications((current) => current.map((item) => item.id === id ? { ...item, is_read: true } : item));
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={loadNotifications} tintColor="#fbbf24" />}
      >
        <Text style={styles.pageTitle}>Notifications</Text>
        <Text style={styles.subtitle}>Parking updates and report status changes.</Text>
        {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
        {isLoading ? <ActivityIndicator color="#fbbf24" /> : null}
        {!isLoading && !notifications.length ? (
          <View style={styles.card}><Text style={styles.emptyText}>You’re all caught up.</Text></View>
        ) : null}
        {notifications.map((notification) => (
          <View key={notification.id} style={[styles.card, !notification.is_read && styles.unreadCard]}>
            <View style={styles.notificationHeader}>
              <Text style={styles.cardTitle}>{notification.is_read ? 'UPDATE' : 'NEW UPDATE'}</Text>
              <Text style={styles.dateText}>{new Date(notification.created_at).toLocaleString()}</Text>
            </View>
            <Text style={styles.itemText}>{notification.message}</Text>
            {!notification.is_read ? (
              <TouchableOpacity style={styles.markReadButton} onPress={() => void markRead(notification.id)}>
                <Text style={styles.markReadText}>Mark as read</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B1120' },
  scrollContent: { padding: 20 },
  pageTitle: { color: '#fff', fontSize: 24, fontWeight: 'bold' },
  subtitle: { color: '#94a3b8', fontSize: 13, marginTop: 5, marginBottom: 20 },
  card: { backgroundColor: '#1e293b', borderRadius: 14, padding: 16, marginBottom: 12 },
  unreadCard: { borderWidth: 1, borderColor: '#fbbf24' },
  notificationHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  cardTitle: { color: '#fbbf24', fontSize: 11, fontWeight: 'bold', letterSpacing: 1 },
  dateText: { color: '#64748b', fontSize: 10 },
  itemText: { color: '#f8fafc', fontSize: 14, lineHeight: 20 },
  markReadButton: { alignSelf: 'flex-start', marginTop: 12, paddingVertical: 5 },
  markReadText: { color: '#60a5fa', fontSize: 12, fontWeight: '600' },
  emptyText: { color: '#94a3b8', textAlign: 'center', padding: 10 },
  errorText: { color: '#fca5a5', marginBottom: 12 },
});
