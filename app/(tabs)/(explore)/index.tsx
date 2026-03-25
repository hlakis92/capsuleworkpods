import { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  Animated,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/contexts/AuthContext';
import { apiGet } from '@/utils/api';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { AnimatedListItem } from '@/components/AnimatedListItem';
import { SkeletonCard } from '@/components/SkeletonLoader';
import { MapPin, ChevronRight } from 'lucide-react-native';

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

export default function ExploreScreen() {
  const COLORS = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const heroOpacity = useRef(new Animated.Value(0)).current;

  const fetchData = useCallback(async () => {
    console.log('[Explore] Fetching locations');
    try {
      const data = await apiGet<{ locations: Location[] }>('/api/locations');
      setLocations(data.locations || []);
      setError('');
      Animated.timing(heroOpacity, { toValue: 1, duration: 400, useNativeDriver: true }).start();
    } catch (e: unknown) {
      console.error('[Explore] Failed to fetch locations:', e);
      setError('Could not load locations. Check your connection.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [heroOpacity]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = useCallback(() => {
    console.log('[Explore] Pull to refresh');
    setRefreshing(true);
    fetchData();
  }, [fetchData]);

  const featuredLocations = locations.slice(0, 5);
  const nearbyLocations = locations.slice(0, 8);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: COLORS.background }}
      contentContainerStyle={{ paddingBottom: 120 }}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor={COLORS.primary}
        />
      }
    >
      {/* Hero Banner */}
      <View style={{ height: 280, position: 'relative' }}>
        <Image
          source={resolveImageSource(locations[0]?.image_url)}
          style={{ width: '100%', height: '100%' }}
          contentFit="cover"
        />
        <LinearGradient
          colors={['transparent', 'rgba(13,17,23,0.85)']}
          style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 160 }}
        />
        <View
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            padding: 20,
            paddingTop: insets.top + 16,
          }}
        >
          {/* Top bar */}
          <View
            style={{
              position: 'absolute',
              top: insets.top + 12,
              left: 20,
              right: 20,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'space-between',
            }}
          >
            <Text
              style={{
                fontSize: 22,
                fontWeight: '800',
                color: '#FFFFFF',
                fontFamily: 'DMSans_700Bold',
                letterSpacing: -0.5,
              }}
            >
              Capsule
            </Text>
            {user && (
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 18,
                  backgroundColor: COLORS.primary,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ color: '#FFF', fontSize: 14, fontWeight: '700', fontFamily: 'DMSans_700Bold' }}>
                  {(user.name || user.email || 'U').charAt(0).toUpperCase()}
                </Text>
              </View>
            )}
          </View>

          <Text
            style={{
              fontSize: 28,
              fontWeight: '800',
              color: '#FFFFFF',
              fontFamily: 'DMSans_700Bold',
              letterSpacing: -0.5,
              marginBottom: 4,
            }}
          >
            Find your capsule
          </Text>
          <Text
            style={{
              fontSize: 15,
              color: 'rgba(255,255,255,0.75)',
              fontFamily: 'DMSans_400Regular',
            }}
          >
            Private pods across Minnesota
          </Text>
        </View>
      </View>

      {/* Featured Locations */}
      <View style={{ marginTop: 24 }}>
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            paddingHorizontal: 20,
            marginBottom: 14,
          }}
        >
          <Text
            style={{
              fontSize: 19,
              fontWeight: '700',
              color: COLORS.text,
              fontFamily: 'DMSans_700Bold',
              letterSpacing: -0.3,
            }}
          >
            Featured Locations
          </Text>
          <AnimatedPressable
            onPress={() => {
              console.log('[Explore] View all locations pressed');
              router.push('/(tabs)/(locations)');
            }}
          >
            <Text style={{ fontSize: 14, color: COLORS.primary, fontFamily: 'DMSans_600SemiBold' }}>
              View all
            </Text>
          </AnimatedPressable>
        </View>

        {loading ? (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20, gap: 12 }}>
            {[0, 1, 2].map((i) => (
              <View key={i} style={{ width: 220 }}>
                <SkeletonCard />
              </View>
            ))}
          </ScrollView>
        ) : (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 20, gap: 12 }}
          >
            {featuredLocations.map((loc, index) => {
              const availableText = `${loc.available_pod_count ?? 0} available`;
              return (
                <AnimatedListItem key={loc.id} index={index}>
                  <AnimatedPressable
                    onPress={() => {
                      console.log('[Explore] Location card pressed:', loc.slug);
                      router.push(`/(tabs)/location/${loc.slug}`);
                    }}
                    style={{
                      width: 220,
                      backgroundColor: COLORS.surface,
                      borderRadius: 16,
                      overflow: 'hidden',
                      borderWidth: 1,
                      borderColor: COLORS.border,
                      boxShadow: COLORS.cardShadow,
                    }}
                  >
                    <View style={{ height: 130, position: 'relative' }}>
                      <Image
                        source={resolveImageSource(loc.image_url)}
                        style={{ width: '100%', height: '100%' }}
                        contentFit="cover"
                      />
                      <View
                        style={{
                          position: 'absolute',
                          top: 10,
                          right: 10,
                          backgroundColor: loc.available_pod_count > 0 ? COLORS.accentMuted : COLORS.dangerMuted,
                          borderRadius: 8,
                          paddingHorizontal: 8,
                          paddingVertical: 4,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 11,
                            fontWeight: '600',
                            color: loc.available_pod_count > 0 ? COLORS.accent : COLORS.danger,
                            fontFamily: 'DMSans_600SemiBold',
                          }}
                        >
                          {availableText}
                        </Text>
                      </View>
                    </View>
                    <View style={{ padding: 12, gap: 4 }}>
                      <Text
                        style={{
                          fontSize: 15,
                          fontWeight: '700',
                          color: COLORS.text,
                          fontFamily: 'DMSans_700Bold',
                        }}
                        numberOfLines={1}
                      >
                        {loc.name}
                      </Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <MapPin size={12} color={COLORS.textTertiary} />
                        <Text
                          style={{
                            fontSize: 12,
                            color: COLORS.textSecondary,
                            fontFamily: 'DMSans_400Regular',
                          }}
                          numberOfLines={1}
                        >
                          {loc.city}
                          {loc.state ? `, ${loc.state}` : ''}
                        </Text>
                      </View>
                    </View>
                  </AnimatedPressable>
                </AnimatedListItem>
              );
            })}
          </ScrollView>
        )}
      </View>

      {/* Nearby Pods */}
      <View style={{ marginTop: 32, paddingHorizontal: 20 }}>
        <Text
          style={{
            fontSize: 19,
            fontWeight: '700',
            color: COLORS.text,
            fontFamily: 'DMSans_700Bold',
            letterSpacing: -0.3,
            marginBottom: 14,
          }}
        >
          All Locations
        </Text>

        {loading ? (
          <View style={{ gap: 12 }}>
            {[0, 1, 2, 3].map((i) => (
              <SkeletonCard key={i} />
            ))}
          </View>
        ) : error ? (
          <View
            style={{
              backgroundColor: COLORS.dangerMuted,
              borderRadius: 16,
              padding: 20,
              alignItems: 'center',
              gap: 8,
            }}
          >
            <Text style={{ fontSize: 15, color: COLORS.danger, fontFamily: 'DMSans_600SemiBold' }}>
              Couldn't load locations
            </Text>
            <Text style={{ fontSize: 13, color: COLORS.textSecondary, fontFamily: 'DMSans_400Regular', textAlign: 'center' }}>
              {error}
            </Text>
            <AnimatedPressable
              onPress={() => {
                console.log('[Explore] Retry pressed');
                setLoading(true);
                fetchData();
              }}
              style={{
                backgroundColor: COLORS.danger,
                borderRadius: 10,
                paddingVertical: 10,
                paddingHorizontal: 20,
                marginTop: 4,
              }}
            >
              <Text style={{ color: '#FFF', fontSize: 14, fontFamily: 'DMSans_600SemiBold' }}>
                Try again
              </Text>
            </AnimatedPressable>
          </View>
        ) : (
          <View style={{ gap: 12 }}>
            {nearbyLocations.map((loc, index) => {
              const podCountText = `${loc.pod_count ?? 0} pods`;
              const availableText = `${loc.available_pod_count ?? 0} available`;
              return (
                <AnimatedListItem key={loc.id} index={index}>
                  <AnimatedPressable
                    onPress={() => {
                      console.log('[Explore] Nearby location pressed:', loc.slug);
                      router.push(`/(tabs)/location/${loc.slug}`);
                    }}
                    style={{
                      backgroundColor: COLORS.surface,
                      borderRadius: 16,
                      overflow: 'hidden',
                      borderWidth: 1,
                      borderColor: COLORS.border,
                      boxShadow: COLORS.cardShadow,
                    }}
                  >
                    <View style={{ flexDirection: 'row' }}>
                      <Image
                        source={resolveImageSource(loc.image_url)}
                        style={{ width: 100, height: 100 }}
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
                          {loc.name}
                        </Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                          <MapPin size={12} color={COLORS.textTertiary} />
                          <Text
                            style={{
                              fontSize: 12,
                              color: COLORS.textSecondary,
                              fontFamily: 'DMSans_400Regular',
                            }}
                            numberOfLines={1}
                          >
                            {loc.address}
                          </Text>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 }}>
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
                              backgroundColor: loc.available_pod_count > 0 ? COLORS.accentMuted : COLORS.dangerMuted,
                              borderRadius: 6,
                              paddingHorizontal: 8,
                              paddingVertical: 3,
                            }}
                          >
                            <Text
                              style={{
                                fontSize: 11,
                                color: loc.available_pod_count > 0 ? COLORS.accent : COLORS.danger,
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
                    </View>
                  </AnimatedPressable>
                </AnimatedListItem>
              );
            })}
          </View>
        )}
      </View>
    </ScrollView>
  );
}
