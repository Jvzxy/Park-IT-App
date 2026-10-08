import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function ProfileScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.avatarBox}>
          <Ionicons name="person" size={50} color="#94a3b8" />
        </View>
        <Text style={styles.userName}>USTP Student</Text>
        <Text style={styles.userEmail}>student@ustp.edu.ph</Text>
      </View>

      <View style={styles.menuGroup}>
        <TouchableOpacity style={styles.menuItem}>
          <Ionicons name="car-outline" size={22} color="#fff" />
          <Text style={styles.menuText}>My Vehicle Details</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem}>
          <Ionicons name="bookmark-outline" size={22} color="#fff" />
          <Text style={styles.menuText}>Saved Spots</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.menuItem}>
          <Ionicons name="settings-outline" size={22} color="#fff" />
          <Text style={styles.menuText}>Settings</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B1120', padding: 20 },
  header: { alignItems: 'center', marginTop: 30, marginBottom: 40 },
  avatarBox: { width: 100, height: 100, borderRadius: 50, backgroundColor: '#1e293b', justifyContent: 'center', alignItems: 'center', marginBottom: 15 },
  userName: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  userEmail: { color: '#64748b', fontSize: 13, marginTop: 4 },
  menuGroup: { backgroundColor: '#1e293b', borderRadius: 15, paddingHorizontal: 15 },
  menuItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 18, borderBottomWidth: 1, borderBottomColor: '#0f172a' },
  menuText: { color: '#fff', fontSize: 15, marginLeft: 15 },
});