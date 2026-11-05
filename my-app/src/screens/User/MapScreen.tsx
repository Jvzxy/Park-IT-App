import React, { useCallback, useState } from 'react';
import { ActivityIndicator, View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView, Image } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../lib/supabase';
import ZoneModel3D from '../../components/ZoneModel3D';
import ZoneScene3D from '../../components/ZoneScene3D';

interface ParkingZone {
  id: number;
  name: string;
  description: string | null;
  capacity: number;
  current_occupancy: number;
  status: string;
}

export default function MapScreen() {
  const [zones, setZones] = useState<ParkingZone[]>([]);
  const [selectedZone, setSelectedZone] = useState<ParkingZone | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadZones = useCallback(async () => {
    const { data, error } = await supabase
      .from('parking_zones')
      .select('id, name, description, capacity, current_occupancy, status')
      .eq('is_active', true)
      .order('name');

    if (error) setErrorMessage(error.message);
    else {
      setErrorMessage(null);
      setZones(data ?? []);
    }
    setIsLoading(false);
  }, []);

  useFocusEffect(
    useCallback(() => {
      setIsLoading(true);
      void loadZones();
    }, [loadZones]),
  );

  const getZoneStatusColor = (zoneLetter: string, fallbackColor: string) => {
    const zone = zones.find(z => z.name.toUpperCase().includes(zoneLetter));
    if (!zone) return fallbackColor;
    const availability = zone.capacity - zone.current_occupancy;
    if (availability === 0) return '#ef4444'; 
    if (availability / zone.capacity <= 0.1) return '#fbbf24'; 
    return '#34d399'; 
  };

  const handleZonePress = (zoneLetter: string) => {
    const zone = zones.find(z => z.name.toUpperCase().includes(zoneLetter));
    if (zone) setSelectedZone(zone);
    else {
      // Fallback for UI testing
      setSelectedZone({
        id: Math.random(),
        name: `Zone ${zoneLetter}`,
        description: 'Campus Parking',
        capacity: 100,
        current_occupancy: zoneLetter === 'A' ? 100 : 2,
        status: zoneLetter === 'A' ? 'Full' : 'Available'
      });
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Image source={require('../../assets/logo/Park-IT Logo.png')} style={styles.logoImage} resizeMode="contain" />
            <View>
              <Text style={styles.headerTitle}>Park-IT</Text>
              <Text style={styles.headerSubtitle}>USTP-CDO PARKING SPACE</Text>
            </View> 
          </View>
        </View>

        <Text style={styles.pageTitle}>PARKING LOT MAP</Text>

        {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}
        {isLoading ? <ActivityIndicator color="#fbbf24" /> : null}
        
        {/* MAIN MAP: 3D model built from the Blender coordinates (tap a zone to open its floor plan) */}
        <View style={styles.mapContainer}>
          <ZoneModel3D
            view="map"
            height={448}
            tilt={35}
            backgroundColor="#0B1120"
            plateColors={{ A: getZoneStatusColor('A', '#ef4444'), B: getZoneStatusColor('B', '#34d399') }}
            onPlatePress={(id) => handleZonePress(id)}
          />
        </View>

        <Text style={styles.instructionsText}>
          Tap any parking zone on the map to view its location and check the available parking spaces. Choose a zone with vacant spaces before heading to the parking area.
        </Text>
      </ScrollView>

      {/* Zone details use the detailed, interactive 3D scene. */}
      <Modal visible={selectedZone !== null} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <TouchableOpacity style={styles.closeBtn} onPress={() => setSelectedZone(null)}>
              <Ionicons name="close" size={28} color="#000" />
            </TouchableOpacity>
            
            <Text style={styles.modalTitle}>ZONE {selectedZone?.name.replace(/Zone\s*/i, '')}</Text>
            
            {selectedZone && (
              <>
                <Text style={[styles.modalStatus, { color: selectedZone.name.includes('A') ? '#ef4444' : '#10b981' }]}>
                  {selectedZone.status}
                </Text>
                <Text style={styles.modalDescription}>
                  {selectedZone.capacity - selectedZone.current_occupancy} spaces available
                </Text>
              </>
            )}

            <View style={styles.floorPlanBg}>
              {selectedZone ? (
                <ZoneScene3D
                  zone={selectedZone.name.toUpperCase().includes('A') ? 'A' : 'B'}
                  occupancy={selectedZone.capacity > 0 ? selectedZone.current_occupancy / selectedZone.capacity : 0}
                  height={340}
                  backgroundColor="#f8fafc"
                />
              ) : null}
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B1120' },
  scrollContent: { padding: 20, alignItems: 'center' },
  header: { flexDirection: 'row', width: '100%', marginBottom: 20 },
  logoContainer: { flexDirection: 'row', alignItems: 'center' },
  logoImage: { width: 40, height: 40, backgroundColor: '#fff', borderRadius: 5, marginRight: 10 },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  headerSubtitle: { color: '#94a3b8', fontSize: 10 },
  pageTitle: { color: '#fff', fontSize: 16, fontWeight: 'bold', marginBottom: 20, letterSpacing: 1 },
  mapContainer: { width: '100%', height: 450, borderWidth: 1, borderColor: '#334155', justifyContent: 'center', alignItems: 'center', marginVertical: 10 },
  instructionsText: { color: '#94a3b8', textAlign: 'center', fontSize: 12, lineHeight: 18, marginTop: 20 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.75)', justifyContent: 'center', alignItems: 'center' },
  modalCard: { backgroundColor: '#f8fafc', width: '90%', borderRadius: 20, padding: 25, alignItems: 'center' },
  closeBtn: { alignSelf: 'flex-start', padding: 5 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#0f172a', marginTop: 5 },
  floorPlanBg: { width: '100%', height: 360, backgroundColor: '#f8fafc', justifyContent: 'center', alignItems: 'center', marginTop: 10 },
  errorText: { color: '#fca5a5', textAlign: 'center', marginBottom: 10 },
  modalStatus: { fontWeight: 'bold', marginBottom: 2, fontSize: 16 },
  modalDescription: { color: '#475569', textAlign: 'center', marginBottom: 5 },
});