import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Feather, Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../lib/supabase';

interface ParkingZone {
  id: number;
  name: string;
}

const PROBLEM_CATEGORIES = [
  'Blocked entry/exit',
  'Improperly parked',
  'Overcrowded zone',
  'Damaged/unsafe area',
  'Other',
];
const MAX_PHOTO_BYTES = 10 * 1024 * 1024;
const BASE64_VALUES = new Int16Array(128).fill(-1);
'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'.split('').forEach((character, index) => {
  BASE64_VALUES[character.charCodeAt(0)] = index;
});

function decodeBase64(value: string): ArrayBuffer {
  const base64 = value.replace(/\s/g, '');
  if (base64.length % 4 !== 0 || !/^[A-Za-z0-9+/]*={0,2}$/.test(base64)) {
    throw new Error('The selected photo could not be processed. Choose another image and try again.');
  }

  const padding = base64.endsWith('==') ? 2 : base64.endsWith('=') ? 1 : 0;
  const byteLength = (base64.length / 4) * 3 - padding;
  const bytes = new Uint8Array(byteLength);
  let offset = 0;

  for (let index = 0; index < base64.length; index += 4) {
    const first = BASE64_VALUES[base64.charCodeAt(index)];
    const second = BASE64_VALUES[base64.charCodeAt(index + 1)];
    const third = base64[index + 2] === '=' ? 0 : BASE64_VALUES[base64.charCodeAt(index + 2)];
    const fourth = base64[index + 3] === '=' ? 0 : BASE64_VALUES[base64.charCodeAt(index + 3)];
    if (first < 0 || second < 0 || third < 0 || fourth < 0) {
      throw new Error('The selected photo could not be processed. Choose another image and try again.');
    }

    bytes[offset++] = (first << 2) | (second >> 4);
    if (offset < byteLength) bytes[offset++] = (second << 4) | (third >> 2);
    if (offset < byteLength) bytes[offset++] = (third << 6) | fourth;
  }

  return bytes.buffer;
}

export default function ReportScreen() {
  const [zones, setZones] = useState<ParkingZone[]>([]);
  const [selectedZoneId, setSelectedZoneId] = useState<number | null>(null);
  const [selectedCategory, setSelectedCategory] = useState(PROBLEM_CATEGORIES[0]);
  const [description, setDescription] = useState('');
  const [photo, setPhoto] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [isLoadingZones, setIsLoadingZones] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    void supabase
      .from('parking_zones')
      .select('id, name')
      .eq('is_active', true)
      .order('name')
      .then(({ data, error }) => {
        if (!isMounted) return;
        if (error) {
          setErrorMessage(error.message);
        } else {
          const availableZones = data ?? [];
          setZones(availableZones);
          setSelectedZoneId(availableZones[0]?.id ?? null);
        }
        setIsLoadingZones(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const choosePhoto = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Photo access needed', 'Allow photo access to attach evidence to your report.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      quality: 0.75,
      base64: true,
    });
    if (result.canceled) return;

    const selectedPhoto = result.assets[0];
    if (selectedPhoto.fileSize && selectedPhoto.fileSize > MAX_PHOTO_BYTES) {
      Alert.alert('Photo too large', 'Choose an image smaller than 10 MB.');
      return;
    }
    setPhoto(selectedPhoto);
  };

  const submitReport = async () => {
    const trimmedDescription = description.trim();
    if (!selectedZoneId) {
      Alert.alert('No parking zone', 'There are no active parking zones to report.');
      return;
    }
    if (trimmedDescription.length < 8) {
      Alert.alert('Add more detail', 'Describe the issue in at least 8 characters.');
      return;
    }

    setIsSubmitting(true);
    let uploadedPath: string | null = null;
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!userData.user) throw new Error('Sign in before submitting a report.');

      if (photo) {
        if (!photo.base64) {
          throw new Error('Unable to read the selected photo. Choose another image and try again.');
        }
        const imageData = decodeBase64(photo.base64);
        if (imageData.byteLength > MAX_PHOTO_BYTES) {
          throw new Error('Choose an image smaller than 10 MB.');
        }

        uploadedPath = `${userData.user.id}/${Date.now()}.jpg`;
        const { error: uploadError } = await supabase.storage
          .from('report-photos')
          .upload(uploadedPath, imageData, { contentType: 'image/jpeg', upsert: false });
        if (uploadError) throw uploadError;
      }

      const { error: insertError } = await supabase.from('parking_reports').insert({
        student_id: userData.user.id,
        zone_id: selectedZoneId,
        category: selectedCategory,
        description: trimmedDescription,
        photo_url: uploadedPath,
      });
      if (insertError) {
        if (uploadedPath) {
          const { error: cleanupError } = await supabase.storage.from('report-photos').remove([uploadedPath]);
          if (cleanupError) {
            throw new Error(`${insertError.message} Photo cleanup also failed: ${cleanupError.message}`);
          }
        }
        throw insertError;
      }

      setDescription('');
      setPhoto(null);
      Alert.alert('Report submitted', 'Your report was sent to the parking team. You can follow its status in Report History.');
    } catch (error) {
      Alert.alert('Could not submit report', error instanceof Error ? error.message : 'Try again later.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <View style={styles.logoContainer}>
            <Image source={require('../../assets/logo/Park-IT Logo.png')} style={styles.logoImage} resizeMode="contain" />
            <View>
              <Text style={styles.headerTitle}>Park-IT</Text>
              <Text style={styles.headerSubtitle}>USTP-CDO PARKING SPACE</Text>
            </View>
          </View>
        </View>

        <Text style={styles.pageTitle}>Report parking issue</Text>
        {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

        <Text style={styles.label}><Feather name="grid" size={14} color="#94a3b8" /> Zones</Text>
        {isLoadingZones ? <ActivityIndicator color="#fbbf24" /> : (
          <View style={styles.zoneSelectorRow}>
            {zones.map((zone) => (
              <TouchableOpacity
                key={zone.id}
                style={[styles.zoneBox, selectedZoneId === zone.id && styles.zoneBoxActive]}
                onPress={() => setSelectedZoneId(zone.id)}
                accessibilityRole="button"
                accessibilityState={{ selected: selectedZoneId === zone.id }}
              >
                <Text style={styles.zoneBoxTextTitle}>{zone.name}</Text>
              </TouchableOpacity>
            ))}
            {!zones.length ? <Text style={styles.emptyText}>No active zones are available.</Text> : null}
          </View>
        )}

        <Text style={styles.label}><Feather name="list" size={14} color="#94a3b8" /> Problem Category</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryScroll}>
          {PROBLEM_CATEGORIES.map((category) => (
            <TouchableOpacity
              key={category}
              style={[styles.categoryBadge, selectedCategory === category && styles.categoryBadgeActive]}
              onPress={() => setSelectedCategory(category)}
              accessibilityRole="button"
              accessibilityState={{ selected: selectedCategory === category }}
            >
              <Text style={[styles.categoryText, selectedCategory === category && styles.categoryTextActive]}>{category}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        <Text style={styles.label}><Feather name="info" size={14} color="#94a3b8" /> Description</Text>
        <TextInput
          style={styles.input}
          placeholder="Describe the issue and its location..."
          placeholderTextColor="#475569"
          value={description}
          onChangeText={setDescription}
          multiline
          maxLength={1000}
          textAlignVertical="top"
        />

        <Text style={styles.label}><Feather name="camera" size={14} color="#94a3b8" /> Photo</Text>
        <TouchableOpacity style={styles.uploadCard} activeOpacity={0.7} onPress={choosePhoto}>
          {photo ? (
            <>
              <Image source={{ uri: photo.uri }} style={styles.photoPreview} />
              <Text style={styles.uploadMainText}>Tap to replace photo</Text>
            </>
          ) : (
            <>
              <Ionicons name="cloud-upload-sharp" size={44} color="#fff" />
              <Text style={styles.uploadMainText}>Choose a photo</Text>
              <Text style={styles.uploadSubText}>JPG, PNG, or WebP · up to 10 MB</Text>
            </>
          )}
        </TouchableOpacity>

        <Text style={styles.timestampNote}>Date and time are recorded when the report is submitted.</Text>
        <TouchableOpacity style={styles.submitBtn} onPress={submitReport} disabled={isSubmitting || isLoadingZones}>
          {isSubmitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitBtnText}>Submit report</Text>}
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0B1120' },
  scrollContent: { padding: 20, paddingBottom: 36 },
  header: { flexDirection: 'row', marginBottom: 20 },
  logoContainer: { flexDirection: 'row', alignItems: 'center' },
  logoImage: { width: 40, height: 40, backgroundColor: '#fff', borderRadius: 5, marginRight: 10 },
  headerTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  headerSubtitle: { color: '#94a3b8', fontSize: 10 },
  pageTitle: { color: '#ef4444', fontSize: 22, fontWeight: 'bold', marginBottom: 18 },
  label: { color: '#94a3b8', fontSize: 13, fontWeight: 'bold', marginBottom: 10, marginTop: 15 },
  zoneSelectorRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 8 },
  zoneBox: { minWidth: 90, backgroundColor: '#1e293b', height: 70, borderRadius: 12, justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: 'transparent', paddingHorizontal: 12 },
  zoneBoxActive: { borderColor: '#3b82f6', backgroundColor: '#0f172a' },
  zoneBoxTextTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  categoryScroll: { marginBottom: 10 },
  categoryBadge: { backgroundColor: '#1e293b', paddingHorizontal: 14, paddingVertical: 10, borderRadius: 20, marginRight: 10, borderWidth: 1, borderColor: '#334155' },
  categoryBadgeActive: { backgroundColor: '#3b82f6', borderColor: '#3b82f6' },
  categoryText: { color: '#94a3b8', fontSize: 13 },
  categoryTextActive: { color: '#fff', fontWeight: 'bold' },
  input: { minHeight: 110, backgroundColor: '#1e293b', borderRadius: 10, padding: 15, color: '#fff', fontSize: 14, marginBottom: 10 },
  uploadCard: { backgroundColor: '#1e293b', borderWidth: 2, borderColor: '#475569', borderStyle: 'dashed', borderRadius: 15, minHeight: 160, justifyContent: 'center', alignItems: 'center', marginVertical: 10, padding: 14 },
  photoPreview: { width: 120, height: 100, borderRadius: 8 },
  uploadMainText: { color: '#fff', fontWeight: 'bold', fontSize: 14, marginTop: 10 },
  uploadSubText: { color: '#64748b', fontSize: 11, marginTop: 4 },
  timestampNote: { color: '#64748b', fontSize: 12, marginTop: 5 },
  submitBtn: { backgroundColor: '#ef4444', height: 52, borderRadius: 12, justifyContent: 'center', alignItems: 'center', marginTop: 15 },
  submitBtnText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
  errorText: { color: '#fca5a5', fontSize: 12 },
  emptyText: { color: '#94a3b8', paddingVertical: 12 },
});
