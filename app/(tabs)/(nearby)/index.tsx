import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import * as Location from 'expo-location';
import { useColors } from '@/hooks/useColors';
import { capsuleGet } from '@/utils/capsuleApi';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { AnimatedListItem } from '@/components/AnimatedListItem';
import { SkeletonCard } from '@/components/SkeletonLoader';
import { MapPin, Navigation, ChevronRight, Layers } from 'lucide-react-native';

interface CapsuleLocation {
  id: string;
  slug: string;
  name: string;
  address: string;
  city: string;
  state: string;
  image_url: string;
  open_hours: string;
  pod_count: number;
  available_pod_count: number;
  lat?: number;
  lng?: number;
  latitude?: number;
  longitude?: number;
}

interface LocationWithDistance extends CapsuleLocation {
  distance: number;
}

function resolveImageSource(source: string | undefined) {
  if (!source) return { uri: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800' };
  return { uri: source };
}

function haversineDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 3958.8; // miles
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function formatDistance(miles: number): string {
  if (miles < 0.1) return 'Nearby';
  if (miles < 10) return `${miles.toFixed(1)} mi`;
  return `${Math.round(miles)} mi`;
}

export default function NearbyScreen() {
  const COLORS = useColors();
  const router = useRouter();

  const [locations, setLocations] = useState<CapsuleLocation[]>([]);
  const [sortedLocations, setSortedLocations] = useState<LocationWithDistance[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [userCoords, setUserCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [locationPermission, setLocationPermission] = useState<'granted' | 'denied' | 'pending'>('pending');
  const [rangeFilter, setRangeFilter] = useState(50);

  const requestLocation = useCallback(async () => {
    console.log('[NearMe] Requesting location permission');
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        setLocationPermission('granted');
        const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        console.log('[NearMe] Got user location:', coords);
        setUserCoords(coords);
      } else {
        console.log('[NearMe] Location permission denied');
        setLocationPermission('denied');
      }
    } catch (e) {
      console.error('[NearMe] Location error:', e);
      setLocationPermission('denied');
    }
  }, []);

  const fetchLocations = useCallback(async () => {
    console.log('[NearMe] Fetching locations');
    try {
      const data = await capsuleGet<{ locations: CapsuleLocation[] }>('/api/locations');
      setLocations(data.locations || []);
      setError('');
    } catch (e: unknown) {
      console.error('[NearMe] Failed to fetch locations:', e);
      setError('Could not load locations.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    requestLocation();
    fetchLocations();
  }, [requestLocation, fetchLocations]);

  useEffect(() => {
    if (!locations.length) return;
    const withDistance: LocationWithDistance[] = locations.map((loc) => {
      const locLat = loc.lat ?? loc.latitude ?? 44.9778;
      const locLng = loc.lng ?? loc.longitude ?? -93.265;
      const distance = userCoords
        ? haversineDistance(userCoords.lat, userCoords.lng, locLat, locLng)
        : 0;
      return { ...loc, distance };
    });
    const filtered = userCoords
      ? withDistance.filter((l) => l.distance <= rangeFilter)
      : withDistance;
    filtered.sort((a, b) => a.distance - b.distance);
    setSortedLocations(filtered);
  }, [locations, userCoords, rangeFilter]);

  const onRefresh = useCallback(() => {
    console.log('[NearMe] Pull to refresh');
    setRefreshing(true);
    fetchLocations();
  }, [fetchLocations]);

  const RANGE_OPTIONS = [10, 25, 50, 100];

  const renderItem = ({ item, index }: { item: LocationWithDistance; index: number }) => {
    const distanceText = userCoords ? formatDistance(item.distance) : '';
    const isAvailable = (item.available_pod_count ?? 0) > 0;
    const availableText = `${item.available_pod_count ?? 0} available`;
    const podCountText = `${item.pod_count ?? 0} pods`;

    return (
      <AnimatedListItem index={index}>
        <AnimatedPressable
          onPress={() => {
            console.log('[NearMe] Location pressed:', item.slug);
            router.push(`/location/${item.slug}`);
          }}
          style={{
            backgroundColor: COLORS.surface,
            borderRadius: 16,
            overflow: 'hidden',
            borderWidth: 1,
            borderColor: COLORS.border,
            boxShadow: COLORS.cardShadow,
            flexDirection: 'row',
          }}
        >
          <Image
            source={resolveImageSource(item.image_url)}
            style={{ width: 96, height: 96 }}
            contentFit="cover"
          />
          <View style={{ flex: 1, padding: 14, gap: 4, justifyContent: 'center' }}>
            <Text
              style={{
                fontSize: 15,
                fontWeight: '700',
                color: COLORS.text,
                fontFamily: 'DMSans_700Bold',
              }}
              numberOfLines={1}
            >
              {item.name}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <MapPin size={12} color={COLORS.textTertiary} />
              <Text
                style={{ fontSize: 12, color: COLORS.textSecondary, fontFamily: 'DMSans_400Regular' }}
                numberOfLines={1}
              >
                {item.city}
                {item.state ? `, ${item.state}` : ''}
              </Text>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
              {distanceText ? (
                <View
                  style={{
                    backgroundColor: COLORS.primaryMuted,
                    borderRadius: 6,
                    paddingHorizontal: 8,
                    paddingVertical: 3,
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <Navigation size={10} color={COLORS.primary} />
                  <Text style={{ fontSize: 11, color: COLORS.primary, fontFamily: 'DMSans_600SemiBold' }}>
                    {distanceText}
                  </Text>
                </View>
              ) : null}
              <View
                style={{
                  backgroundColor: COLORS.surfaceSecondary,
                  borderRadius: 6,
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                }}
              >
                <Text style={{ fontSize: 11, color: COLORS.textSecondary, fontFamily: 'DMSans_500Medium' }}>
                  {podCountText}
                </Text>
              </View>
              <View
                style={{
                  backgroundColor: isAvailable ? COLORS.accentMuted : COLORS.dangerMuted,
                  borderRadius: 6,
                  paddingHorizontal: 8,
                  paddingVertical: 3,
                }}
              >
                <Text
                  style={{
                    fontSize: 11,
                    color: isAvailable ? COLORS.accent : COLORS.danger,
                    fontFamily: 'DMSans_500Medium',
                  }}
                >
                  {availableText}
                </Text>
              </View>
            </View>
          </View>
          <View style={{ justifyContent: 'center', paddingRight: 14 }}>
            <ChevronRight size={18} color={COLORS.textTertiary} />
          </View>
        </AnimatedPressable>
      </AnimatedListItem>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      {/* Map placeholder for web / native */}
      {Platform.OS !== 'web' && (
        <View
          style={{
            height: 200,
            backgroundColor: COLORS.surfaceSecondary,
            alignItems: 'center',
            justifyContent: 'center',
            borderBottomWidth: 1,
            borderBottomColor: COLORS.border,
          }}
        >
          <MapPin size={32} color={COLORS.primary} />
          <Text style={{ fontSize: 14, color: COLORS.textSecondary, fontFamily: 'DMSans_500Medium', marginTop: 8 }}>
            Map view
          </Text>
          <Text style={{ fontSize: 12, color: COLORS.textTertiary, fontFamily: 'DMSans_400Regular', marginTop: 4 }}>
            {locationPermission === 'granted' ? 'Showing locations near you' : 'Enable location for nearby results'}
          </Text>
        </View>
      )}

      {/* Location permission banner */}
      {locationPermission === 'denied' && (
        <View
          style={{
            backgroundColor: COLORS.warningMuted,
            paddingHorizontal: 16,
            paddingVertical: 12,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
          }}
        >
          <Navigation size={16} color={COLORS.warning} />
          <Text style={{ flex: 1, fontSize: 13, color: COLORS.text, fontFamily: 'DMSans_400Regular' }}>
            Location access denied. Showing all Minnesota locations.
          </Text>
        </View>
      )}

      {/* Range filter */}
      {locationPermission === 'granted' && (
        <View
          style={{
            paddingHorizontal: 16,
            paddingVertical: 12,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            borderBottomWidth: 1,
            borderBottomColor: COLORS.border,
            backgroundColor: COLORS.surface,
          }}
        >
          <Text style={{ fontSize: 13, color: COLORS.textSecondary, fontFamily: 'DMSans_500Medium', marginRight: 4 }}>
            Within:
          </Text>
          {RANGE_OPTIONS.map((r) => {
            const isSelected = rangeFilter === r;
            return (
              <AnimatedPressable
                key={r}
                onPress={() => {
                  console.log('[NearMe] Range filter changed to:', r, 'miles');
                  setRangeFilter(r);
                }}
                style={{
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 20,
                  backgroundColor: isSelected ? COLORS.primary : COLORS.surfaceSecondary,
                }}
              >
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: '600',
                    color: isSelected ? '#FFFFFF' : COLORS.textSecondary,
                    fontFamily: 'DMSans_600SemiBold',
                  }}
                >
                  {r}
                  {' mi'}
                </Text>
              </AnimatedPressable>
            );
          })}
        </View>
      )}

      {loading ? (
        <View style={{ padding: 16, gap: 12 }}>
          {[0, 1, 2, 3].map((i) => <SkeletonCard key={i} />)}
        </View>
      ) : error ? (
        <View
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            padding: 32,
            gap: 12,
          }}
        >
          <Text style={{ fontSize: 17, fontWeight: '600', color: COLORS.text, fontFamily: 'DMSans_600SemiBold' }}>
            Couldn't load locations
          </Text>
          <Text style={{ fontSize: 14, color: COLORS.textSecondary, fontFamily: 'DMSans_400Regular', textAlign: 'center' }}>
            {error}
          </Text>
          <AnimatedPressable
            onPress={() => {
              console.log('[NearMe] Retry pressed');
              setLoading(true);
              fetchLocations();
            }}
            style={{
              backgroundColor: COLORS.primary,
              borderRadius: 12,
              paddingVertical: 12,
              paddingHorizontal: 24,
            }}
          >
            <Text style={{ color: '#FFF', fontSize: 15, fontFamily: 'DMSans_600SemiBold' }}>
              Try again
            </Text>
          </AnimatedPressable>
        </View>
      ) : (
        <FlatList
          data={sortedLocations}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 120 }}
          style={{ backgroundColor: COLORS.background }}
          contentInsetAdjustmentBehavior="automatic"
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
          }
          ListHeaderComponent={
            sortedLocations.length > 0 ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <Layers size={14} color={COLORS.textTertiary} />
                <Text style={{ fontSize: 13, color: COLORS.textTertiary, fontFamily: 'DMSans_400Regular' }}>
                  {sortedLocations.length}
                  {' location'}
                  {sortedLocations.length !== 1 ? 's' : ''}
                  {userCoords ? ` within ${rangeFilter} miles` : ' in Minnesota'}
                </Text>
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingTop: 60, gap: 16, paddingHorizontal: 32 }}>
              <View
                style={{
                  width: 72,
                  height: 72,
                  borderRadius: 22,
                  backgroundColor: COLORS.primaryMuted,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <MapPin size={32} color={COLORS.primary} />
              </View>
              <Text style={{ fontSize: 18, fontWeight: '700', color: COLORS.text, fontFamily: 'DMSans_700Bold', textAlign: 'center' }}>
                No locations nearby
              </Text>
              <Text style={{ fontSize: 14, color: COLORS.textSecondary, fontFamily: 'DMSans_400Regular', textAlign: 'center', lineHeight: 20 }}>
                Try increasing the range filter to see more locations.
              </Text>
              <AnimatedPressable
                onPress={() => {
                  console.log('[NearMe] Increase range pressed');
                  setRangeFilter(100);
                }}
                style={{
                  backgroundColor: COLORS.primary,
                  borderRadius: 12,
                  paddingVertical: 12,
                  paddingHorizontal: 24,
                }}
              >
                <Text style={{ color: '#FFF', fontSize: 14, fontFamily: 'DMSans_600SemiBold' }}>
                  Show all locations
                </Text>
              </AnimatedPressable>
            </View>
          }
        />
      )}
    </View>
  );
}
