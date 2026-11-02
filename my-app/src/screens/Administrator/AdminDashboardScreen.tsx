import React from 'react';
import { View, Text, ScrollView, StyleSheet, SafeAreaView } from 'react-native';

export default function AdminDashboardScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.padding}>
        <Text style={styles.header}>Admin Overview</Text>
        <View style={styles.grid}>
          <View style={styles.card}><Text style={styles.val}>1,204</Text><Text style={styles.label}>Students</Text></View>
          <View style={styles.card}><Text style={styles.val}>12</Text><Text style={styles.label}>Guards</Text></View>
          <View style={styles.card}><Text style={styles.val}>5</Text><Text style={styles.label}>Total Zones</Text></View>
          <View style={styles.card}><Text style={styles.val}>80%</Text><Text style={styles.label}>Total Capacity</Text></View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B1120' },
  padding: { padding: 20 },
  header: { color: '#fff', fontSize: 22, fontWeight: 'bold', marginBottom: 20 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'space-between' },
  card: { backgroundColor: '#1e293b', width: '48%', padding: 15, borderRadius: 8, alignItems: 'center', marginBottom: 10 },
  val: { color: '#34d399', fontSize: 20, fontWeight: 'bold' },
  label: { color: '#94a3b8', fontSize: 12, marginTop: 5 },
});