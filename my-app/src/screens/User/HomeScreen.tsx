import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Modal, RefreshControl, View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Feather } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../lib/supabase';

const GUIDE_STORAGE_KEY = 'park-it-user-guide-seen';

const navigationGuide = [
  { icon: 'home', title: 'Home', description: 'Check total parking availability, announcements, and the recommended zone.', route: 'HOME' },
  { icon: 'map', title: 'Map', description: 'Explore parking zones and tap a zone for its location and available spaces.', route: 'MAP' },
  { icon: 'flag', title: 'Report', description: 'Send a parking issue to staff and include details to help them respond.', route: 'REPORT' },
  { icon: 'bell', title: 'Notifications', description: 'Review updates about your reports and important campus announcements.', route: 'NOTIFICATION' },
  { icon: 'user', title: 'Profile', description: 'Manage your profile, vehicle details, reports, and account settings.', route: 'PROFILE' },
] as const;

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
  const [isGuideVisible, setIsGuideVisible] = useState(false);
  const guideStorageKey = useRef(GUIDE_STORAGE_KEY);

  useEffect(() => {
    let isMounted = true;
    const loadGuidePreference = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error) throw error;
      guideStorageKey.current = `${GUIDE_STORAGE_KEY}:${data.user?.id ?? 'anonymous'}`;
      const hasSeenGuide = await AsyncStorage.getItem(guideStorageKey.current);
      if (isMounted && hasSeenGuide !== 'true') setIsGuideVisible(true);
    };

    void loadGuidePreference().catch((error: unknown) => {
      if (!isMounted) return;
      setErrorMessage(error instanceof Error ? error.message : 'Unable to load the navigation guide.');
      setIsGuideVisible(true);
    });

    return () => {
      isMounted = false;
    };
  }, []);

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
  const recommendedAvailable = recommendedZone
    ? recommendedZone.capacity - recommendedZone.current_occupancy
    : 0;
  const recommendedPercent = recommendedZone?.capacity
    ? Math.round((recommendedAvailable / recommendedZone.capacity) * 100)
    : 0;
  const isRecommendedNearlyFull = Boolean(
    recommendedZone &&
      recommendedAvailable > 0 &&
      recommendedZone.status.toLowerCase().includes('nearly full'),
  );

  const closeGuide = async () => {
    setIsGuideVisible(false);
    try {
      await AsyncStorage.setItem(guideStorageKey.current, 'true');
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : 'Unable to save the navigation guide preference.');
    }
  };

  const openGuideDestination = async (route: (typeof navigationGuide)[number]['route']) => {
    await closeGuide();
    navigation.navigate(route);
  };

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
          <TouchableOpacity style={styles.guideButton} onPress={() => setIsGuideVisible(true)} accessibilityRole="button">
            <Feather name="help-circle" size={16} color="#fbbf24" />
            <Text style={styles.guideButtonText}>Guide</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.reportBtn}
          onPress={() => navigation.navigate('REPORT')}
          accessibilityRole="button"
          accessibilityLabel="Report a parking issue"
        >
          <Feather name="flag" size={16} color="#fff" />
          <Text style={styles.reportBtnText}>Report a Parking Issue</Text>
        </TouchableOpacity>

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
          <View style={styles.zoneCard}>
            <View style={styles.zoneHeader}>
              <View>
                <View style={styles.zoneNameRow}>
                  <Text style={styles.zoneName}>{recommendedZone.name}</Text>
                  <View style={[styles.statusDotGreen, isRecommendedNearlyFull && styles.statusDotYellow]} />
                </View>
                <Text style={[styles.zoneStatusGreen, isRecommendedNearlyFull && styles.zoneStatusYellow]}>Recommended · {recommendedZone.status}</Text>
              </View>
              <View style={styles.zoneStatsRight}>
                <Text style={[styles.zoneOpenNumber, isRecommendedNearlyFull && styles.zoneOpenNumberYellow]}>{recommendedAvailable} Open</Text>
                <Text style={styles.zoneTotalText}>of {recommendedZone.capacity} Slots</Text>
              </View>
            </View>
            <View style={styles.zoneProgressRow}>
              <View style={[styles.progressBarBg, { flex: 1, marginRight: 10 }]}>
                <View style={[styles.progressBarFill, { width: `${recommendedPercent}%`, backgroundColor: isRecommendedNearlyFull ? '#fbbf24' : '#34d399' }]} />
              </View>
              <Text style={[styles.zonePercentGreen, isRecommendedNearlyFull && styles.zonePercentYellow]}>{recommendedPercent}% Avail.</Text>
            </View>
          </View>
        ) : (
          <View style={styles.zoneCard}>
            <Text style={styles.recommendationText}>No parking spaces are currently available.</Text>
          </View>
        )}

        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>CAMPUS PARKING ZONES</Text>
          <Text style={styles.activeZonesText}>{zones.length} Active</Text>
        </View>
        {zones.map((zone) => {
          const available = zone.capacity - zone.current_occupancy;
          const isOpen = available > 0;
          const isNearlyFull = isOpen && zone.status.toLowerCase().includes('nearly full');
          const availabilityPercent = zone.capacity ? Math.round((available / zone.capacity) * 100) : 0;
          return (
            <View key={zone.id} style={styles.zoneCard}>
              <View style={styles.zoneHeader}>
                <View>
                  <View style={styles.zoneNameRow}>
                    <Text style={styles.zoneName}>{zone.name}</Text>
                    <View style={[styles.statusDotGreen, !isOpen && styles.statusDotRed, isNearlyFull && styles.statusDotYellow]} />
                  </View>
                  <Text style={[styles.zoneStatusGreen, !isOpen && styles.zoneStatusRed, isNearlyFull && styles.zoneStatusYellow]}>{zone.status}</Text>
                </View>
                <View style={styles.zoneStatsRight}>
                  <Text style={[styles.zoneOpenNumber, !isOpen && styles.zoneClosedNumber, isNearlyFull && styles.zoneOpenNumberYellow]}>{available} Open</Text>
                  <Text style={styles.zoneTotalText}>of {zone.capacity} Slots</Text>
                </View>
              </View>
              <View style={styles.zoneProgressRow}>
                <View style={[styles.progressBarBg, { flex: 1, marginRight: 10 }]}>
                  <View style={[styles.progressBarFill, { width: `${availabilityPercent}%`, backgroundColor: !isOpen ? '#ef4444' : isNearlyFull ? '#fbbf24' : '#34d399' }]} />
                </View>
                <Text style={[styles.zonePercentGreen, !isOpen && styles.zonePercentRed, isNearlyFull && styles.zonePercentYellow]}>{availabilityPercent}% Avail.</Text>
              </View>
            </View>
          );
        })}
      </ScrollView>
      <Modal visible={isGuideVisible} transparent animationType="fade" onRequestClose={() => void closeGuide()}>
        <View style={styles.guideOverlay}>
          <View style={styles.guideCard}>
            <View style={styles.guideHeader}>
              <View style={styles.guideIcon}><Feather name="compass" size={22} color="#fbbf24" /></View>
              <TouchableOpacity onPress={() => void closeGuide()} accessibilityRole="button" accessibilityLabel="Close guide">
                <Feather name="x" size={22} color="#94a3b8" />
              </TouchableOpacity>
            </View>
            <Text style={styles.guideTitle}>Welcome to Park-IT</Text>
            <Text style={styles.guideSubtitle}>A quick guide to the tools available in your navigation bar.</Text>
            <ScrollView style={styles.guideList} showsVerticalScrollIndicator={false}>
              {navigationGuide.map((item) => (
                <TouchableOpacity
                  key={item.route}
                  style={styles.guideItem}
                  onPress={() => void openGuideDestination(item.route)}
                  accessibilityRole="button"
                  accessibilityLabel={`Go to ${item.title}`}
                >
                  <View style={styles.guideItemIcon}><Feather name={item.icon} size={17} color="#fbbf24" /></View>
                  <View style={styles.guideItemText}>
                    <Text style={styles.guideItemTitle}>{item.title}</Text>
                    <Text style={styles.guideItemDescription}>{item.description}</Text>
                  </View>
                  <Feather name="chevron-right" size={17} color="#64748b" />
                </TouchableOpacity>
              ))}
            </ScrollView>
            <TouchableOpacity style={styles.guideDoneButton} onPress={() => void closeGuide()}>
              <Text style={styles.guideDoneText}>Get started</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
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
  reportBtn: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 9, alignSelf: 'center', backgroundColor: '#ef4444', paddingVertical: 12, paddingHorizontal: 22, borderRadius: 12, marginBottom: 20, minWidth: 220 },
  reportBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 13 },
  guideButton: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingVertical: 8, paddingHorizontal: 10, borderWidth: 1, borderColor: '#334155', borderRadius: 18 },
  guideButtonText: { color: '#fbbf24', fontSize: 12, fontWeight: '600' },
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
  statusDotYellow: { backgroundColor: '#fbbf24' },
  zoneStatusGreen: { color: '#34d399', fontSize: 11 },
  zoneStatusRed: { color: '#ef4444', fontSize: 11 },
  zoneStatusYellow: { color: '#fbbf24' },
  zoneStatsRight: { alignItems: 'flex-end' },
  zoneOpenNumber: { color: '#34d399', fontSize: 22, fontWeight: 'bold' },
  zoneClosedNumber: { color: '#ef4444', fontSize: 22, fontWeight: 'bold' },
  zoneOpenNumberYellow: { color: '#fbbf24' },
  zoneTotalText: { color: '#64748b', fontSize: 11 },
  zoneProgressRow: { flexDirection: 'row', alignItems: 'center' },
  zonePercentGreen: { color: '#34d399', fontSize: 12, fontWeight: 'bold', width: 60, textAlign: 'right' },
  zonePercentRed: { color: '#ef4444', fontSize: 12, fontWeight: 'bold', width: 60, textAlign: 'right' },
  zonePercentYellow: { color: '#fbbf24' },
  recommendationText: { color: '#94a3b8', fontSize: 13, marginBottom: 10 },
  guideOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  guideCard: { width: '100%', maxWidth: 480, maxHeight: '90%', backgroundColor: '#111b2d', borderColor: '#26344a', borderWidth: 1, borderRadius: 20, padding: 20 },
  guideHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
  guideIcon: { width: 42, height: 42, borderRadius: 13, backgroundColor: 'rgba(251,191,36,0.12)', justifyContent: 'center', alignItems: 'center' },
  guideTitle: { color: '#f8fafc', fontSize: 22, fontWeight: 'bold', marginBottom: 6 },
  guideSubtitle: { color: '#94a3b8', fontSize: 13, lineHeight: 19, marginBottom: 14 },
  guideList: { flexShrink: 1 },
  guideItem: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderTopWidth: 1, borderTopColor: '#26344a' },
  guideItemIcon: { width: 34, height: 34, borderRadius: 10, backgroundColor: '#1e293b', justifyContent: 'center', alignItems: 'center' },
  guideItemText: { flex: 1 },
  guideItemTitle: { color: '#f8fafc', fontSize: 13, fontWeight: 'bold', marginBottom: 3 },
  guideItemDescription: { color: '#94a3b8', fontSize: 11, lineHeight: 16 },
  guideDoneButton: { alignItems: 'center', backgroundColor: '#fbbf24', borderRadius: 10, paddingVertical: 12, marginTop: 16 },
  guideDoneText: { color: '#172033', fontWeight: 'bold', fontSize: 13 },
  errorText: { color: '#fca5a5', fontSize: 12, marginBottom: 12 },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  activeZonesText: { color: '#64748b', fontSize: 12 },
});