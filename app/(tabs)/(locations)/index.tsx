import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  RefreshControl,
  useWindowDimensions,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { Image } from 'expo-image';
import { useColors } from '@/hooks/useColors';
import { apiGet } from '@/utils/api';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { AnimatedListItem } from '@/components/AnimatedListItem';
import { SkeletonCard } from '@/components/SkeletonLoader';
import { MapPin, Clock } from 'lucide-react-native';

interface Location {
  id: string;
  slug: string;
  name: string;
  address: string;
  city: string;
  state: string;
  image_url: string;
  description: string;
  open_hours: string;
  pod_count: number;
  available_pod_count: number;
}

function resolveImageSource(source: string | undefined) {
  if (!source) return { uri: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800' };
  return { uri: source };
}

export default function LocationsScreen() {
  const COLORS = useColors();
  const router = useRouter();
  const { width } = useWindowDimensions();

  const [locations, setLocations] = useState<Location[]>([]);
  const [filtered, setFiltered] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [, setSearchQuery] = useState('');
  const [error, setError] = useState('');

  const cardWidth = (width - 48) / 2;

  const fetchLocations = useCallback(async () => {
    console.log('[Locations] Fetching all locations');
    try {
      const data = await apiGet<{ locations: Location[] }>('/api/locations');
      const locs = data.locations || [];
      setLocations(locs);
      setFiltered(locs);
      setError('');
    } catch (e: unknown) {
      console.error('[Locations] Failed to fetch:', e);
      setError('Could not load locations.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchLocations();
  }, [fetchLocations]);

  const onRefresh = useCallback(() => {
    console.log('[Locations] Pull to refresh');
    setRefreshing(true);
    fetchLocations();
  }, [fetchLocations]);

  const renderItem = ({ item, index }: { item: Location; index: number }) => {
    const availableText = `${item.available_pod_count ?? 0} available`;
    const isAvailable = (item.available_pod_count ?? 0) > 0;

    return (
      <AnimatedListItem index={index}>
        <AnimatedPressable
          onPress={() => {
            console.log('[Locations] Location pressed:', item.slug);
            router.push(`/(tabs)/location/${item.slug}`);
          }}
          style={{
            width: cardWidth,
            backgroundColor: COLORS.surface,
            borderRadius: 16,
            overflow: 'hidden',
            borderWidth: 1,
            borderColor: COLORS.border,
            boxShadow: COLORS.cardShadow,
          }}
        >
          <View style={{ height: 120, position: 'relative' }}>
            <Image
              source={resolveImageSource(item.image_url)}
              style={{ width: '100%', height: '100%' }}
              contentFit="cover"
            />
            <View
              style={{
                position: 'absolute',
                top: 8,
                right: 8,
                backgroundColor: isAvailable ? COLORS.accentMuted : COLORS.dangerMuted,
                borderRadius: 8,
                paddingHorizontal: 7,
                paddingVertical: 3,
              }}
            >
              <Text
                style={{
                  fontSize: 10,
                  fontWeight: '600',
                  color: isAvailable ? COLORS.accent : COLORS.danger,
                  fontFamily: 'DMSans_600SemiBold',
                }}
              >
                {availableText}
              </Text>
            </View>
          </View>
          <View style={{ padding: 12, gap: 5 }}>
            <Text
              style={{
                fontSize: 14,
                fontWeight: '700',
                color: COLORS.text,
                fontFamily: 'DMSans_700Bold',
              }}
              numberOfLines={1}
            >
              {item.name}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
              <MapPin size={11} color={COLORS.textTertiary} />
              <Text
                style={{
                  fontSize: 11,
                  color: COLORS.textSecondary,
                  fontFamily: 'DMSans_400Regular',
                  flex: 1,
                }}
                numberOfLines={1}
              >
                {item.city}
              </Text>
            </View>
            {item.open_hours ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <Clock size={11} color={COLORS.textTertiary} />
                <Text
                  style={{
                    fontSize: 11,
                    color: COLORS.textSecondary,
                    fontFamily: 'DMSans_400Regular',
                    flex: 1,
                  }}
                  numberOfLines={1}
                >
                  {item.open_hours}
                </Text>
              </View>
            ) : null}
          </View>
        </AnimatedPressable>
      </AnimatedListItem>
    );
  };

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Locations',
          headerSearchBarOptions: {
            placeholder: 'Search locations...',
            onChangeText: (e) => {
              const q = e.nativeEvent.text.toLowerCase();
              setSearchQuery(q);
              console.log('[Locations] Search query:', q);
              if (!q) {
                setFiltered(locations);
              } else {
                setFiltered(
                  locations.filter(
                    (l) =>
                      l.name.toLowerCase().includes(q) ||
                      l.city.toLowerCase().includes(q) ||
                      l.address.toLowerCase().includes(q)
                  )
                );
              }
            },
          },
        }}
      />
      {loading ? (
        <View
          style={{
            flex: 1,
            backgroundColor: COLORS.background,
            padding: 16,
          }}
        >
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 16 }}>
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <View key={i} style={{ width: cardWidth }}>
                <SkeletonCard />
              </View>
            ))}
          </View>
        </View>
      ) : error ? (
        <View
          style={{
            flex: 1,
            backgroundColor: COLORS.background,
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
              console.log('[Locations] Retry pressed');
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
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          numColumns={2}
          contentContainerStyle={{
            padding: 16,
            gap: 16,
            paddingBottom: 120,
          }}
          columnWrapperStyle={{ gap: 16 }}
          style={{ backgroundColor: COLORS.background }}
          contentInsetAdjustmentBehavior="automatic"
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
          }
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingTop: 60, gap: 12 }}>
              <View
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 20,
                  backgroundColor: COLORS.primaryMuted,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <MapPin size={28} color={COLORS.primary} />
              </View>
              <Text style={{ fontSize: 17, fontWeight: '600', color: COLORS.text, fontFamily: 'DMSans_600SemiBold' }}>
                No locations found
              </Text>
              <Text style={{ fontSize: 14, color: COLORS.textSecondary, fontFamily: 'DMSans_400Regular', textAlign: 'center' }}>
                Try a different search term
              </Text>
            </View>
          }
        />
      )}
    </>
  );
}
