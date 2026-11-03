import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';

export default function SystemSettingsScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.padding}>
        <Text style={styles.header}>System & Security</Text>

        <TouchableOpacity style={styles.menuItem}><Text style={styles.menuTxt}>Manage Administrator Roles</Text></TouchableOpacity>
        <TouchableOpacity style={styles.menuItem}><Text style={styles.menuTxt}>Configure System Notifications</Text></TouchableOpacity>
        <TouchableOpacity style={styles.menuItem}><Text style={styles.menuTxt}>View System Activity Logs</Text></TouchableOpacity>
        <TouchableOpacity style={styles.menuItem}><Text style={styles.menuTxt}>Manage App Announcements</Text></TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B1120' },
  padding: { padding: 20 },
  header: { color: '#fff', fontSize: 22, fontWeight: 'bold', marginBottom: 15 },
  menuItem: { backgroundColor: '#1e293b', padding: 18, borderRadius: 8, marginBottom: 10 },
  menuTxt: { color: '#fff', fontSize: 14, fontWeight: '600' }
});