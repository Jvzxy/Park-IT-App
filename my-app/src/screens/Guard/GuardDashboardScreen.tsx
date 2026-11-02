import React from 'react';
import { View, Text, ScrollView, StyleSheet, SafeAreaView } from 'react-native';

export default function GuardDashboardScreen() {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.padding}>
        <Text style={styles.header}>Dashboard Overview</Text>
        <View style={styles.grid}>
          <View style={styles.card}><Text style={styles.val}>150</Text><Text style={styles.label}>Total Capacity</Text></View>
          <View style={styles.card}><Text style={styles.val}>120</Text><Text style={styles.label}>Occupied</Text></View>
          <View style={styles.card}><Text style={styles.val}>30</Text><Text style={styles.label}>Available</Text></View>
          <View style={styles.card}><Text style={styles.val}>Zone A</Text><Text style={styles.label}>Full Zones</Text></View>
        </View>
        
        <Text style={styles.sectionTitle}>Reports Overview</Text>
        <View style={styles.grid}>
          <View style={styles.card}><Text style={styles.val}>5</Text><Text style={styles.label}>Pending</Text></View>
          <View style={styles.card}><Text style={styles.val}>12</Text><Text style={styles.label}>Resolved</Text></View>
        </View>

        <Text style={styles.sectionTitle}>Recent Activities</Text>
        <View style={styles.listItem}><Text style={styles.listText}>Vehicle XYZ entered Zone B</Text></View>
        <View style={styles.listItem}><Text style={styles.listText}>Report #102 marked resolved</Text></View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B1120' },
  padding: { padding: 20 },
  header: { color: '#fff', fontSize: 22, fontWeight: 'bold', marginBottom: 20 },
  sectionTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold', marginTop: 20, marginBottom: 10 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'space-between' },
  card: { backgroundColor: '#1e293b', width: '48%', padding: 15, borderRadius: 8, alignItems: 'center' },
  val: { color: '#fbbf24', fontSize: 20, fontWeight: 'bold' },
  label: { color: '#94a3b8', fontSize: 12, marginTop: 5 },
  listItem: { backgroundColor: '#1e293b', padding: 15, borderRadius: 8, marginBottom: 10 },
  listText: { color: '#fff' }
});