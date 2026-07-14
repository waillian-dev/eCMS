import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, ActivityIndicator, Alert, SafeAreaView, ScrollView, Platform } from 'react-native';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { api } from '../../services/api';
import { Feather, AntDesign } from '@expo/vector-icons';

interface Category {
  _id: string;
  name: string;
}

export default function CreateComplaint() {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [address, setAddress] = useState('123 Municipal Plaza, Central District');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [driverName, setDriverName] = useState('');
  const [licensePlate, setLicensePlate] = useState('');
  const [tripId, setTripId] = useState('');
  const [bookingReference, setBookingReference] = useState('');
  const [routeFrom, setRouteFrom] = useState('');
  const [routeTo, setRouteTo] = useState('');
  const [categories, setCategories] = useState<Category[]>([]);
  const [images, setImages] = useState<ImagePicker.ImagePickerAsset[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchingCats, setFetchingCats] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const res = await api.get('/complaints/categories');
        setCategories(res.data);
        if (res.data.length > 0) {
          setCategoryId(res.data[0]._id);
        }
      } catch (err) {
        console.error('Failed to fetch categories', err);
        Alert.alert('Network Error', 'Failed to retrieve complaint categories list.');
      } finally {
        setFetchingCats(false);
      }
    };
    fetchCategories();
  }, []);

  const handlePickImage = async () => {
    const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permissionResult.granted) {
      Alert.alert('Permission Required', 'Cooperation requires library permission to upload proof.');
      return;
    }

    const pickerResult = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.7, // Perform compression before upload
    });

    if (!pickerResult.canceled && pickerResult.assets) {
      setImages((prev) => [...prev, ...pickerResult.assets]);
    }
  };

  const handleRemoveImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!title || !description || !categoryId || !licensePlate) {
      Alert.alert('Validation Error', 'Title, description, category, and license plate are required.');
      return;
    }

    setLoading(true);

    try {
      // Setup multipart form data
      const formData = new FormData();
      formData.append('title', title);
      formData.append('description', description);
      formData.append('categoryId', categoryId);
      formData.append('isAnonymous', isAnonymous ? 'true' : 'false');
      formData.append('address', address);
      formData.append('driverName', driverName);
      formData.append('licensePlate', licensePlate);
      formData.append('tripId', tripId);
      formData.append('bookingReference', bookingReference);
      formData.append('routeFrom', routeFrom);
      formData.append('routeTo', routeTo);

      // Default mock coordinates
      formData.append('longitude', '-122.4194');
      formData.append('latitude', '37.7749');

      // Append images
      images.forEach((img, idx) => {
        const uriParts = img.uri.split('.');
        const fileExtension = uriParts[uriParts.length - 1];

        formData.append('attachments', {
          uri: Platform.OS === 'android' ? img.uri : img.uri.replace('file://', ''),
          name: `photo-${idx}-${Date.now()}.${fileExtension}`,
          type: img.mimeType || 'image/jpeg',
        } as any);
      });

      await api.post('/complaints', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      Alert.alert('Complaint Filed', 'Your complaint has been logged and assigned. Track it on your dashboard.', [
        { text: 'OK', onPress: () => router.replace('/(tabs)') },
      ]);
    } catch (err: any) {
      console.error(err);
      const errMsg = err.response?.data?.error || 'Failed to submit complaint. Try again.';
      Alert.alert('Submission Failed', errMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Feather name="arrow-left" size={20} color="#94A3B8" />
            <Text style={styles.backText}>Cancel</Text>
          </TouchableOpacity>
          <Text style={styles.title}>File Complaint</Text>
        </View>

        <View style={styles.form}>
          {/* Category Selector */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Select Category</Text>
            {fetchingCats ? (
              <ActivityIndicator color="#3B82F6" size="small" style={{ alignSelf: 'flex-start' }} />
            ) : (
              <View style={styles.categoriesList}>
                {categories.map((cat) => {
                  const isSelected = cat._id === categoryId;
                  return (
                    <TouchableOpacity
                      key={cat._id}
                      style={[styles.categoryBadge, isSelected && styles.categoryBadgeActive]}
                      onPress={() => setCategoryId(cat._id)}
                    >
                      <Text style={[styles.categoryBadgeText, isSelected && styles.categoryBadgeTextActive]}>
                        {cat.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            )}
          </View>

          {/* Title */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Incident Title</Text>
            <TextInput
              style={styles.input}
              value={title}
              onChangeText={setTitle}
              placeholder="e.g. Large Road pothole near main crossroad"
              placeholderTextColor="#64748B"
              autoCapitalize="sentences"
            />
          </View>

          {/* Description */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Detailed Description</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={description}
              onChangeText={setDescription}
              placeholder="Provide context, details, hazard level, and exact location markers..."
              placeholderTextColor="#64748B"
              multiline
              numberOfLines={5}
              autoCapitalize="sentences"
            />
          </View>

          {/* Taxi Ride Metadata */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>License Plate (Required)</Text>
            <TextInput
              style={styles.input}
              value={licensePlate}
              onChangeText={setLicensePlate}
              placeholder="e.g. TX-9988 or 123-ABC"
              placeholderTextColor="#64748B"
              autoCapitalize="characters"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Driver Name</Text>
            <TextInput
              style={styles.input}
              value={driverName}
              onChangeText={setDriverName}
              placeholder="e.g. John Doe"
              placeholderTextColor="#64748B"
              autoCapitalize="words"
            />
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Trip / Ride ID</Text>
            <TextInput
              style={styles.input}
              value={tripId}
              onChangeText={setTripId}
              placeholder="e.g. TRIP-5544"
              placeholderTextColor="#64748B"
              autoCapitalize="none"
            />
          </View>

          <View style={{ flexDirection: 'row', gap: 12 }}>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>Pickup Route</Text>
              <TextInput
                style={styles.input}
                value={routeFrom}
                onChangeText={setRouteFrom}
                placeholder="From..."
                placeholderTextColor="#64748B"
              />
            </View>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.label}>Dropoff Route</Text>
              <TextInput
                style={styles.input}
                value={routeTo}
                onChangeText={setRouteTo}
                placeholder="To..."
                placeholderTextColor="#64748B"
              />
            </View>
          </View>

          {/* GPS Location address */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Resolved GPS Address</Text>
            <TextInput
              style={styles.input}
              value={address}
              onChangeText={setAddress}
              placeholder="Pinpoint location address"
              placeholderTextColor="#64748B"
            />
          </View>

          {/* Anonymous Slider */}
          <TouchableOpacity
            style={styles.toggleRow}
            onPress={() => setIsAnonymous(!isAnonymous)}
          >
            <Text style={styles.toggleLabel}>File Anonymously</Text>
            <View style={[styles.toggleOuter, isAnonymous && styles.toggleOuterActive]}>
              <View style={[styles.toggleInner, isAnonymous && styles.toggleInnerActive]} />
            </View>
          </TouchableOpacity>

          {/* Media Attachments Picker */}
          <View style={styles.mediaSection}>
            <Text style={styles.label}>Evidence Attachments</Text>
            <View style={styles.mediaRow}>
              {images.map((img, index) => (
                <View key={index} style={styles.mediaBox}>
                  <Text style={styles.mediaBoxText}>File {index + 1}</Text>
                  <TouchableOpacity
                    style={styles.removeMediaButton}
                    onPress={() => handleRemoveImage(index)}
                  >
                    <Feather name="x-circle" size={18} color="#EF4444" />
                  </TouchableOpacity>
                </View>
              ))}

              {images.length < 5 && (
                <TouchableOpacity style={styles.pickButton} onPress={handlePickImage}>
                  <Feather name="camera" size={20} color="#3B82F6" />
                  <Text style={styles.pickText}>Add Photo</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>

          <TouchableOpacity
            style={styles.submitButton}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.submitButtonText}>File Ticket Now</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#090D16',
  },
  scrollContent: {
    padding: 24,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 32,
    justifyContent: 'space-between',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  backText: {
    color: '#94A3B8',
    fontSize: 14,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFFFFF',
    marginLeft: 'auto',
    marginRight: 24,
  },
  form: {
    gap: 20,
  },
  inputGroup: {
    gap: 8,
  },
  label: {
    color: '#94A3B8',
    fontSize: 12,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  input: {
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#1E293B',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    color: '#FFFFFF',
    fontSize: 15,
  },
  textArea: {
    height: 100,
    textAlignVertical: 'top',
  },
  categoriesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4,
  },
  categoryBadge: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#1E293B',
    backgroundColor: '#0F172A',
  },
  categoryBadgeActive: {
    borderColor: '#2563EB',
    backgroundColor: '#2563EB',
  },
  categoryBadgeText: {
    color: '#94A3B8',
    fontSize: 12,
  },
  categoryBadgeTextActive: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  toggleLabel: {
    color: '#E2E8F0',
    fontSize: 14,
    fontWeight: '500',
  },
  toggleOuter: {
    width: 48,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#1E293B',
    padding: 3,
    justifyContent: 'center',
    marginLeft: 'auto',
  },
  toggleOuterActive: {
    backgroundColor: '#2563EB',
  },
  toggleInner: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#64748B',
  },
  toggleInnerActive: {
    backgroundColor: '#FFFFFF',
    alignSelf: 'flex-end',
  },
  mediaSection: {
    gap: 12,
  },
  mediaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  pickButton: {
    borderWidth: 1,
    borderColor: '#3B82F6',
    backgroundColor: '#3B82F6/10',
    borderRadius: 12,
    width: 80,
    height: 80,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  pickText: {
    color: '#3B82F6',
    fontSize: 10,
    fontWeight: 'bold',
  },
  mediaBox: {
    width: 80,
    height: 80,
    borderRadius: 12,
    backgroundColor: '#0F172A',
    borderWidth: 1,
    borderColor: '#1E293B',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  mediaBoxText: {
    color: '#64748B',
    fontSize: 10,
  },
  removeMediaButton: {
    position: 'absolute',
    top: -6,
    right: -6,
  },
  submitButton: {
    backgroundColor: '#2563EB',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 16,
  },
  submitButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
});
