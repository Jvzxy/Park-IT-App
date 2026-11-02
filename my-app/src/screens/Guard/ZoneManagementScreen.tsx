import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';

export default function ZoneManagementScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.padding}>
        <Text style={styles.header}>Zone Management</Text>
        
        <View style={styles.card}>
          <Text style={styles.zoneTitle}>Zone A (Main Entrance)</Text>
          <Text style={styles.info}>Capacity: 50 / 50</Text>
          <Text style={styles.info}>Status: Full (Overcrowding Alert)</Text>
          <View style={styles.btnRow}>
            <TouchableOpacity style={styles.actionBtn}><Text style={styles.btnText}>Set Available</Text></TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn}><Text style={styles.btnText}>Set Full</Text></TouchableOpacity>
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.zoneTitle}>Zone B (Engineering)</Text>
          <Text style={styles.info}>Capacity: 30 / 50</Text>
          <Text style={styles.info}>Status: Available</Text>
          <View style={styles.btnRow}>
            <TouchableOpacity style={styles.actionBtn}><Text style={styles.btnText}>Set Nearly Full</Text></TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn}><Text style={styles.btnText}>Update Details</Text></TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B1120' },
  padding: { padding: 20 },
  header: { color: '#fff', fontSize: 22, fontWeight: 'bold', marginBottom: 20 },
  card: { backgroundColor: '#1e293b', padding: 15, borderRadius: 8, marginBottom: 15 },
  zoneTitle: { color: '#fbbf24', fontSize: 18, fontWeight: 'bold', marginBottom: 5 },
  info: { color: '#94a3b8', marginBottom: 5 },
  btnRow: { flexDirection: 'row', gap: 10, marginTop: 10 },
  actionBtn: { backgroundColor: '#334155', paddingVertical: 8, paddingHorizontal: 12, borderRadius: 5 },
  btnText: { color: '#fff', fontSize: 12 }
});