import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export default function ReportHistoryScreen({ navigation }: any) {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>My Reports</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.reportCard}>
          <View style={styles.cardHeader}>
            <Text style={styles.reportCategory}>Blocked entry/exit</Text>
            <View style={[styles.statusBadge, { backgroundColor: 'rgba(251, 191, 36, 0.2)' }]}>
              <Text style={[styles.statusText, { color: '#fbbf24' }]}>Pending</Text>
            </View>
          </View>
          <Text style={styles.reportDetail}>Zone A • Oct 12, 2026 - 1:15 PM</Text>
          <Text style={styles.reportDesc}>A white sedan is blocking the main exit lane.</Text>
        </View>

        <View style={styles.reportCard}>
          <View style={styles.cardHeader}>
            <Text style={styles.reportCategory}>Improperly parked</Text>
            <View style={[styles.statusBadge, { backgroundColor: 'rgba(52, 211, 153, 0.2)' }]}>
              <Text style={[styles.statusText, { color: '#34d399' }]}>Resolved</Text>
            </View>
          </View>
          <Text style={styles.reportDetail}>Zone B • Oct 05, 2026 - 9:30 AM</Text>
          <Text style={styles.reportDesc}>Motorcycle parked across two designated slots.</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B1120' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 20, borderBottomWidth: 1, borderBottomColor: '#1e293b' },
  backBtn: { padding: 5 },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  scrollContent: { padding: 20 },
  reportCard: { backgroundColor: '#1e293b', borderRadius: 12, padding: 16, marginBottom: 15 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  reportCategory: { color: '#fff', fontSize: 16, fontWeight: 'bold' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 12, fontWeight: 'bold' },
  reportDetail: { color: '#94a3b8', fontSize: 12, marginBottom: 8 },
  reportDesc: { color: '#f8fafc', fontSize: 13, lineHeight: 18 },
});