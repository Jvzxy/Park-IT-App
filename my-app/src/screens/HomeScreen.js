import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// 1. Pass the navigation prop here
export default function HomeScreen({ navigation }) {
  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            {/* Placeholder for Logo */}
            <View style={styles.logoBox} />
            <View>
              <Text style={styles.headerTitle}>Park-IT</Text>
              <Text style={styles.headerSubtitle}>USTP-CDO PARKING SPACE</Text>
            </View>
          </View>
          
          {/* 2. Add the onPress navigation event here */}
          <TouchableOpacity 
            style={styles.reportBtn}
            onPress={() => navigation.navigate('REPORT')}
          >
            <Text style={styles.reportBtnText}>Report</Text>
          </TouchableOpacity>
        </View>

        {/* Total Availability Card */}
        <View style={styles.mainCard}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>TOTAL PARKING{'\n'}AVAILABILITY</Text>
            <View style={styles.liveBadge}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>LIVE</Text>
            </View>
          </View>
          
          <View style={styles.statsRow}>
            <Text style={styles.highlightNumber}>98</Text>
            <Text style={styles.subNumber}> / 200 Slots Free</Text>
          </View>
          
          <Text style={styles.description}>
            Real-time parking capacity across monitored USTP zones. Smart sensors automatically detect vacant and occupied spaces, allowing students to check availability before entering the parking area.
          </Text>

          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: '44%', backgroundColor: '#34d399' }]} />
          </View>
          <View style={styles.progressLabels}>
            <Text style={styles.progressGreenText}>44% Open Capacity</Text>
            <Text style={styles.progressGrayText}>102 Occupied</Text>
          </View>
        </View>

        {/* Recommend Zone */}
        <Text style={styles.sectionTitle}>RECOMMEND ZONE TO GO</Text>
        <View style={styles.zoneCard}>
          <View style={styles.zoneHeader}>
            <View>
              <Text style={styles.zoneName}>Zone B <View style={styles.statusDotGreen} /></Text>
              <Text style={styles.zoneStatusGreen}>OPEN - Parking spaces are available</Text>
            </View>
            <View style={styles.zoneStatsRight}>
              <Text style={styles.zoneOpenNumber}>98 Open</Text>
              <Text style={styles.zoneTotalText}>of 100 Slots</Text>
            </View>
          </View>
          <View style={styles.zoneProgressRow}>
            <View style={[styles.progressBarBg, { flex: 1, marginRight: 10 }]}>
              <View style={[styles.progressBarFill, { width: '96%', backgroundColor: '#34d399' }]} />
            </View>
            <Text style={styles.zonePercentGreen}>96% Avail.</Text>
          </View>
        </View>

        {/* Campus Parking Zones */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>CAMPUS PARKING ZONES</Text>
          <Text style={styles.activeZonesText}>2 Zones Active</Text>
        </View>

        {/* Zone A - Full */}
        <View style={styles.zoneCard}>
          <View style={styles.zoneHeader}>
            <View>
              <Text style={styles.zoneName}>Zone A <View style={styles.statusDotRed} /></Text>
              <Text style={styles.zoneStatusRed}>CLOSE - Parking spaces are full</Text>
            </View>
            <View style={styles.zoneStatsRight}>
              <Text style={styles.zoneClosedNumber}>0 Open</Text>
              <Text style={styles.zoneTotalText}>of 100 Slots</Text>
            </View>
          </View>
          <View style={styles.zoneProgressRow}>
            <View style={[styles.progressBarBg, { flex: 1, marginRight: 10 }]}>
              <View style={[styles.progressBarFill, { width: '0%', backgroundColor: '#ef4444' }]} />
            </View>
            <Text style={styles.zonePercentRed}>0% Avail.</Text>
          </View>
        </View>

        {/* Zone B - Duplicate for list */}
        <View style={styles.zoneCard}>
          <View style={styles.zoneHeader}>
            <View>
              <Text style={styles.zoneName}>Zone B <View style={styles.statusDotGreen} /></Text>
              <Text style={styles.zoneStatusGreen}>OPEN - Parking spaces are available</Text>
            </View>
            <View style={styles.zoneStatsRight}>
              <Text style={styles.zoneOpenNumber}>98 Open</Text>
              <Text style={styles.zoneTotalText}>of 100 Slots</Text>
            </View>
          </View>
          <View style={styles.zoneProgressRow}>
            <View style={[styles.progressBarBg, { flex: 1, marginRight: 10 }]}>
              <View style={[styles.progressBarFill, { width: '96%', backgroundColor: '#34d399' }]} />
            </View>
            <Text style={styles.zonePercentGreen}>96% Avail.</Text>
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B1120' },
  scrollContent: { padding: 20, paddingBottom: 100 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 },
  logoContainer: { flexDirection: 'row', alignItems: 'center' },
  logoBox: { width: 40, height: 40, backgroundColor: '#fff', borderRadius: 5, marginRight: 10 },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  headerSubtitle: { color: '#94a3b8', fontSize: 10 },
  reportBtn: { backgroundColor: '#ef4444', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20 },
  reportBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 12 },
  
  mainCard: { backgroundColor: '#1e293b', borderRadius: 15, padding: 20, marginBottom: 25 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  cardTitle: { color: '#94a3b8', fontSize: 14, fontWeight: 'bold', letterSpacing: 1 },
  liveBadge: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#34d399', borderRadius: 15, paddingHorizontal: 10, paddingVertical: 4 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#34d399', marginRight: 5 },
  liveText: { color: '#34d399', fontSize: 10, fontWeight: 'bold' },
  statsRow: { flexDirection: 'row', alignItems: 'baseline', marginTop: 15, marginBottom: 10 },
  highlightNumber: { color: '#fbbf24', fontSize: 48, fontWeight: 'bold' },
  subNumber: { color: '#94a3b8', fontSize: 16, fontWeight: 'bold' },
  description: { color: '#64748b', fontSize: 12, lineHeight: 18, marginBottom: 20 },
  progressBarBg: { height: 8, backgroundColor: '#0f172a', borderRadius: 4, overflow: 'hidden' },
  progressBarFill: { height: '100%', borderRadius: 4 },
  progressLabels: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 8 },
  progressGreenText: { color: '#34d399', fontSize: 12, fontWeight: '600' },
  progressGrayText: { color: '#64748b', fontSize: 12 },

  sectionTitle: { color: '#f8fafc', fontSize: 14, fontWeight: 'bold', marginBottom: 15, marginTop: 10 },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  activeZonesText: { color: '#64748b', fontSize: 12 },
  
  zoneCard: { backgroundColor: '#1e293b', borderRadius: 12, padding: 15, marginBottom: 15 },
  zoneHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  zoneName: { color: '#f8fafc', fontSize: 16, fontWeight: 'bold', marginBottom: 4 },
  statusDotGreen: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#34d399', marginLeft: 5 },
  statusDotRed: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#ef4444', marginLeft: 5 },
  zoneStatusGreen: { color: '#34d399', fontSize: 11 },
  zoneStatusRed: { color: '#ef4444', fontSize: 11 },
  zoneStatsRight: { alignItems: 'flex-end' },
  zoneOpenNumber: { color: '#34d399', fontSize: 22, fontWeight: 'bold' },
  zoneClosedNumber: { color: '#ef4444', fontSize: 22, fontWeight: 'bold' },
  zoneTotalText: { color: '#64748b', fontSize: 11 },
  zoneProgressRow: { flexDirection: 'row', alignItems: 'center' },
  zonePercentGreen: { color: '#34d399', fontSize: 12, fontWeight: 'bold', width: 60, textAlign: 'right' },
  zonePercentRed: { color: '#ef4444', fontSize: 12, fontWeight: 'bold', width: 60, textAlign: 'right' },
});