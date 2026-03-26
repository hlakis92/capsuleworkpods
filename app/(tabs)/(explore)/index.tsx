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
import { capsuleGet } from '@/utils/capsuleApi';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { AnimatedListItem } from '@/components/AnimatedListItem';
import { SkeletonCard } from '@/components/SkeletonLoader';
import { MapPin, ChevronRight, Layers } from 'lucide-react-native';

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
    console.log('[Explore] Fetching locations from capsuleworkpods.com');
    try {
      const data = await capsuleGet<{ locations: Location[] }>('/api/locations');
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

  const featuredLocation = locations[0];
  const otherLocations = locations.slice(1);

  const initials = user ? (user.name || user.email || 'U').charAt(0).toUpperCase() : '';

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
      <View style={{ height: 300, position: 'relative' }}>
        <Image
          source={resolveImageSource(featuredLocation?.image_url)}
          style={{ width: '100%', height: '100%' }}
          contentFit="cover"
        />
        <LinearGradient
          colors={['rgba(27,43,75,0.5)', 'transparent', 'rgba(13,17,23,0.9)']}
          style={{ position: 'absolute', inset: 0 }}
        />

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
          <View>
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
            <Text style={{ fontSize: 11, color: 'rgba(255,255,255,0.65)', fontFamily: 'DMSans_400Regular' }}>
              WorkPods
            </Text>
          </View>
          {user && (
            <View
              style={{
                width: 38,
                height: 38,
                borderRadius: 19,
                backgroundColor: '#1B2B4B',
                alignItems: 'center',
                justifyContent: 'center',
                borderWidth: 2,
                borderColor: 'rgba(255,255,255,0.3)',
              }}
            >
              <Text style={{ color: '#FFF', fontSize: 15, fontWeight: '700', fontFamily: 'DMSans_700Bold' }}>
                {initials}
              </Text>
            </View>
          )}
        </View>

        {/* Hero text */}
        <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20 }}>
          <Text
            style={{
              fontSize: 30,
              fontWeight: '800',
              color: '#FFFFFF',
              fontFamily: 'DMSans_700Bold',
              letterSpacing: -0.8,
              marginBottom: 4,
            }}
          >
            Work Anywhere{'\n'}in Minnesota
          </Text>
          <Text
            style={{
              fontSize: 14,
              color: 'rgba(255,255,255,0.72)',
              fontFamily: 'DMSans_400Regular',
            }}
          >
            Private capsule pods for focused work
          </Text>
        </View>
      </View>

      {/* Featured location hero card */}
      {!loading && featuredLocation && (
        <View style={{ paddingHorizontal: 16, marginTop: 20 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <Text
              style={{
                fontSize: 19,
                fontWeight: '700',
                color: COLORS.text,
                fontFamily: 'DMSans_700Bold',
                letterSpacing: -0.3,
              }}
            >
              Featured
            </Text>
          </View>
          <AnimatedListItem index={0}>
            <AnimatedPressable
              onPress={() => {
                console.log('[Explore] Featured location pressed:', featuredLocation.slug);
                router.push(`/location/${featuredLocation.slug}`);
              }}
              style={{
                backgroundColor: COLORS.surface,
                borderRadius: 20,
                overflow: 'hidden',
                borderWidth: 1,
                borderColor: COLORS.border,
                boxShadow: COLORS.cardShadow,
              }}
            >
              <View style={{ height: 180, position: 'relative' }}>
                <Image
                  source={resolveImageSource(featuredLocation.image_url)}
                  style={{ width: '100%', height: '100%' }}
                  contentFit="cover"
                />
                <LinearGradient
                  colors={['transparent', 'rgba(13,17,23,0.7)']}
                  style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 100 }}
                />
                <View
                  style={{
                    position: 'absolute',
                    top: 12,
                    right: 12,
                    backgroundColor: featuredLocation.available_pod_count > 0 ? COLORS.accentMuted : COLORS.dangerMuted,
                    borderRadius: 8,
                    paddingHorizontal: 10,
                    paddingVertical: 5,
                  }}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: '600',
                      color: featuredLocation.available_pod_count > 0 ? COLORS.accent : COLORS.danger,
                      fontFamily: 'DMSans_600SemiBold',
                    }}
                  >
                    {featuredLocation.available_pod_count > 0 ? `${featuredLocation.available_pod_count} available` : 'Full'}
                  </Text>
                </View>
              </View>
              <View style={{ padding: 16, gap: 6 }}>
                <Text
                  style={{
                    fontSize: 18,
                    fontWeight: '700',
                    color: COLORS.text,
                    fontFamily: 'DMSans_700Bold',
                    letterSpacing: -0.3,
                  }}
                >
                  {featuredLocation.name}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <MapPin size={13} color={COLORS.textTertiary} />
                    <Text style={{ fontSize: 13, color: COLORS.textSecondary, fontFamily: 'DMSans_400Regular' }}>
                      {featuredLocation.city}
                      {featuredLocation.state ? `, ${featuredLocation.state}` : ''}
                    </Text>
                  </View>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <Layers size={13} color={COLORS.textTertiary} />
                    <Text style={{ fontSize: 13, color: COLORS.textSecondary, fontFamily: 'DMSans_400Regular' }}>
                      {featuredLocation.pod_count ?? 0}
                      {' pods'}
                    </Text>
                  </View>
                </View>
              </View>
            </AnimatedPressable>
          </AnimatedListItem>
        </View>
      )}

      {/* All Locations */}
      <View style={{ marginTop: 28, paddingHorizontal: 16 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <Text
            style={{
              fontSize: 19,
              fontWeight: '700',
              color: COLORS.text,
              fontFamily: 'DMSans_700Bold',
              letterSpacing: -0.3,
            }}
          >
            All Locations
          </Text>
          <Text style={{ fontSize: 13, color: COLORS.textTertiary, fontFamily: 'DMSans_400Regular' }}>
            {loading ? '' : `${locations.length} locations`}
          </Text>
        </View>

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
            {otherLocations.map((loc, index) => {
              const podCountText = `${loc.pod_count ?? 0} pods`;
              const availableText = `${loc.available_pod_count ?? 0} available`;
              const isAvailable = (loc.available_pod_count ?? 0) > 0;
              return (
                <AnimatedListItem key={loc.id} index={index + 1}>
                  <AnimatedPressable
                    onPress={() => {
                      console.log('[Explore] Location card pressed:', loc.slug);
                      router.push(`/location/${loc.slug}`);
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
                          {loc.city}
                          {loc.state ? `, ${loc.state}` : ''}
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
            })}
          </View>
        )}
      </View>
    </ScrollView>
  );
}
