import React, { useCallback, useState } from 'react';
import { ActivityIndicator, RefreshControl, View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';

interface ParkingZone {
  id: number;
  name: string;
  description: string | null;
  capacity: number;
  current_occupancy: number;
  status: string;
  is_active: boolean;
}

interface Announcement {
  id: number;
  message: string;
}

interface HomeScreenProps {
  navigation: any;
}

export default function HomeScreen({ navigation }: HomeScreenProps) {
  const [zones, setZones] = useState<ParkingZone[]>([]);
  const [announcement, setAnnouncement] = useState<Announcement | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadDashboard = useCallback(async () => {
    const [zonesResult, announcementsResult] = await Promise.all([
      supabase
        .from('parking_zones')
        .select('id, name, description, capacity, current_occupancy, status, is_active')
        .eq('is_active', true)
        .order('name'),
      supabase
        .from('announcements')
        .select('id, message, expires_at')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1),
    ]);

    if (zonesResult.error || announcementsResult.error) {
      setErrorMessage(zonesResult.error?.message ?? announcementsResult.error?.message ?? 'Unable to load parking data.');
    } else {
      setErrorMessage(null);
      setZones(zonesResult.data ?? []);
      const currentAnnouncement = announcementsResult.data?.[0];
      setAnnouncement(
        currentAnnouncement && (!currentAnnouncement.expires_at || new Date(currentAnnouncement.expires_at) > new Date())
          ? currentAnnouncement
          : null,
      );
    }
    setIsLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      setIsLoading(true);
      void loadDashboard();
    }, [loadDashboard]),
  );

  const totalCapacity = zones.reduce((total, zone) => total + zone.capacity, 0);
  const totalOccupied = zones.reduce((total, zone) => total + zone.current_occupancy, 0);
  const totalAvailable = totalCapacity - totalOccupied;
  const availablePercent = totalCapacity ? Math.round((totalAvailable / totalCapacity) * 100) : 0;
  const recommendedZone = zones
    .filter((zone) => zone.capacity > zone.current_occupancy)
    .sort((left, right) => (left.current_occupancy / left.capacity) - (right.current_occupancy / right.capacity))[0];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={loadDashboard} tintColor="#fbbf24" />}
      >
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Image 
              source={require('../../assets/logo/Park-IT Logo.png')}
              style={styles.logoImage} 
              resizeMode="contain" 
            />
            <View>
              <Text style={styles.headerTitle}>Park-IT</Text>
              <Text style={styles.headerSubtitle}>USTP-CDO PARKING SPACE</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.reportBtn} onPress={() => navigation.navigate('REPORT')}>
            <Text style={styles.reportBtnText}>Report</Text>
          </TouchableOpacity>
        </View>

        {announcement ? (
          <View style={styles.announcementCard}>
            <View style={styles.announcementHeader}>
              <Feather name="bell" size={16} color="#fbbf24" />
              <Text style={styles.announcementTitle}>LATEST ANNOUNCEMENT</Text>
            </View>
            <Text style={styles.announcementText}>{announcement.message}</Text>
          </View>
        ) : null}

        {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

        <View style={styles.mainCard}>
          <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>TOTAL PARKING{'\n'}AVAILABILITY</Text>
            <View style={styles.liveBadge}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>LIVE</Text>
            </View>
          </View>
          <View style={styles.statsRow}>
            <Text style={styles.highlightNumber}>{isLoading ? '—' : totalAvailable}</Text>
            <Text style={styles.subNumber}> / {totalCapacity} Slots Free</Text>
          </View>
          <Text style={styles.description}>
            Real-time parking capacity across monitored USTP zones. Smart sensors automatically detect vacant and occupied spaces.
          </Text>
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${availablePercent}%`, backgroundColor: '#34d399' }]} />
          </View>
          <View style={styles.progressLabels}>
            <Text style={styles.progressGreenText}>{availablePercent}% Open Capacity</Text>
            <Text style={styles.progressGrayText}>{totalOccupied} Occupied</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>RECOMMEND ZONE TO GO</Text>
        {isLoading ? (
          <ActivityIndicator color="#fbbf24" />
        ) : recommendedZone ? (
          <Text style={styles.recommendationText}>
            {recommendedZone.name} has {recommendedZone.capacity - recommendedZone.current_occupancy} spaces available.
          </Text>
        ) : (
          <Text style={styles.recommendationText}>No parking spaces are currently available.</Text>
        )}

        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>CAMPUS PARKING ZONES</Text>
          <Text style={styles.activeZonesText}>{zones.length} Active</Text>
        </View>
        {zones.map((zone) => {
          const available = zone.capacity - zone.current_occupancy;
          const isOpen = available > 0;
          const availabilityPercent = zone.capacity ? Math.round((available / zone.capacity) * 100) : 0;
          return (
            <View key={zone.id} style={styles.zoneCard}>
              <View style={styles.zoneHeader}>
                <View>
                  <View style={styles.zoneNameRow}>
                    <Text style={styles.zoneName}>{zone.name}</Text>
                    <View style={[styles.statusDotGreen, !isOpen && styles.statusDotRed]} />
                  </View>
                  <Text style={[styles.zoneStatusGreen, !isOpen && styles.zoneStatusRed]}>{zone.status}</Text>
                </View>
                <View style={styles.zoneStatsRight}>
                  <Text style={[styles.zoneOpenNumber, !isOpen && styles.zoneClosedNumber]}>{available} Open</Text>
                  <Text style={styles.zoneTotalText}>of {zone.capacity} Slots</Text>
                </View>
              </View>
              <View style={styles.zoneProgressRow}>
                <View style={[styles.progressBarBg, { flex: 1, marginRight: 10 }]}>
                  <View style={[styles.progressBarFill, { width: `${availabilityPercent}%`, backgroundColor: isOpen ? '#34d399' : '#ef4444' }]} />
                </View>
                <Text style={[styles.zonePercentGreen, !isOpen && styles.zonePercentRed]}>{availabilityPercent}% Avail.</Text>
              </View>
            </View>
          );
        })}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B1120' },
  scrollContent: { padding: 20, paddingBottom: 100 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  logoContainer: { flexDirection: 'row', alignItems: 'center' },
  logoImage: { width: 40, height: 40, backgroundColor: '#fff', borderRadius: 5, marginRight: 10, alignSelf: 'center' },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  headerSubtitle: { color: '#94a3b8', fontSize: 10 },
  reportBtn: { backgroundColor: '#ef4444', paddingVertical: 8, paddingHorizontal: 16, borderRadius: 20 },
  reportBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 12 },
  announcementCard: { backgroundColor: 'rgba(251, 191, 36, 0.1)', borderWidth: 1, borderColor: 'rgba(251, 191, 36, 0.3)', borderRadius: 12, padding: 15, marginBottom: 20 },
  announcementHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 5 },
  announcementTitle: { color: '#fbbf24', fontSize: 12, fontWeight: 'bold', marginLeft: 8, letterSpacing: 1 },
  announcementText: { color: '#f8fafc', fontSize: 13, lineHeight: 18 },
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
  zoneCard: { backgroundColor: '#1e293b', borderRadius: 12, padding: 15, marginBottom: 15 },
  zoneHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  zoneNameRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 4 },
  zoneName: { color: '#f8fafc', fontSize: 16, fontWeight: 'bold' },
  statusDotGreen: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#34d399', marginLeft: 5 },
  statusDotRed: { backgroundColor: '#ef4444' },
  zoneStatusGreen: { color: '#34d399', fontSize: 11 },
  zoneStatusRed: { color: '#ef4444', fontSize: 11 },
  zoneStatsRight: { alignItems: 'flex-end' },
  zoneOpenNumber: { color: '#34d399', fontSize: 22, fontWeight: 'bold' },
  zoneClosedNumber: { color: '#ef4444', fontSize: 22, fontWeight: 'bold' },
  zoneTotalText: { color: '#64748b', fontSize: 11 },
  zoneProgressRow: { flexDirection: 'row', alignItems: 'center' },
  zonePercentGreen: { color: '#34d399', fontSize: 12, fontWeight: 'bold', width: 60, textAlign: 'right' },
  zonePercentRed: { color: '#ef4444', fontSize: 12, fontWeight: 'bold', width: 60, textAlign: 'right' },
  recommendationText: { color: '#94a3b8', fontSize: 13, marginBottom: 10 },
  errorText: { color: '#fca5a5', fontSize: 12, marginBottom: 12 },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  activeZonesText: { color: '#64748b', fontSize: 12 },
});