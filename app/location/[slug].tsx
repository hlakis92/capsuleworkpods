import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  Pressable,
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { useColors } from '@/hooks/useColors';
import { capsuleGet } from '@/utils/capsuleApi';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { AnimatedListItem } from '@/components/AnimatedListItem';
import { SkeletonLine } from '@/components/SkeletonLoader';
import { StatusBadge } from '@/components/StatusBadge';
import { ArrowLeft, MapPin, Clock, ChevronRight } from 'lucide-react-native';

interface Pod {
  id: string;
  name: string;
  type: string;
  price_per_hour: number;
  amenities: string | string[];
  image_url: string;
  is_out_of_service: boolean;
}

interface LocationDetail {
  id: string;
  slug: string;
  name: string;
  address: string;
  city: string;
  state: string;
  image_url: string;
  description: string;
  open_hours: string;
  pods: Pod[];
}

function resolveImageSource(source: string | undefined) {
  if (!source) return { uri: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800' };
  return { uri: source };
}

function parseAmenities(amenities: string | string[] | undefined): string[] {
  if (!amenities) return [];
  if (Array.isArray(amenities)) return amenities;
  try {
    const parsed = JSON.parse(amenities);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export default function LocationDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const COLORS = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [location, setLocation] = useState<LocationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const fetchLocation = useCallback(async () => {
    if (!slug) return;
    console.log('[LocationDetail] Fetching location:', slug);
    try {
      const data = await capsuleGet<LocationDetail>(`/api/locations/${slug}`);
      setLocation(data);
      setError('');
    } catch (e: unknown) {
      console.error('[LocationDetail] Failed to fetch:', e);
      setError('Could not load location details.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [slug]);

  useEffect(() => {
    fetchLocation();
  }, [fetchLocation]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchLocation();
  }, [fetchLocation]);

  const availablePods = location?.pods?.filter((p) => !p.is_out_of_service) ?? [];
  const outOfServicePods = location?.pods?.filter((p) => p.is_out_of_service) ?? [];
  const allPods = location?.pods ?? [];

  const priceDisplay = (price: number) => {
    const p = Number(price);
    return isNaN(p) ? '$0/hr' : `$${p.toFixed(0)}/hr`;
  };

  return (
    <View style={{ flex: 1, backgroundColor: COLORS.background }}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
        }
      >
        {/* Hero Image */}
        <View style={{ height: 280, position: 'relative' }}>
          {loading ? (
            <View style={{ width: '100%', height: '100%', backgroundColor: COLORS.surfaceSecondary }} />
          ) : (
            <Image
              source={resolveImageSource(location?.image_url)}
              style={{ width: '100%', height: '100%' }}
              contentFit="cover"
            />
          )}
          <LinearGradient
            colors={['rgba(0,0,0,0.35)', 'transparent', 'rgba(0,0,0,0.75)']}
            style={{ position: 'absolute', inset: 0 }}
          />

          {/* Back button */}
          <Pressable
            onPress={() => {
              console.log('[LocationDetail] Back pressed');
              router.back();
            }}
            style={{
              position: 'absolute',
              top: insets.top + 12,
              left: 16,
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: 'rgba(0,0,0,0.4)',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ArrowLeft size={20} color="#FFFFFF" />
          </Pressable>

          {/* Location info overlay */}
          <View style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: 20 }}>
            {loading ? (
              <View style={{ gap: 8 }}>
                <SkeletonLine width="70%" height={22} />
                <SkeletonLine width="50%" height={14} />
              </View>
            ) : (
              <>
                <Text
                  style={{
                    fontSize: 26,
                    fontWeight: '800',
                    color: '#FFFFFF',
                    fontFamily: 'DMSans_700Bold',
                    letterSpacing: -0.5,
                    marginBottom: 6,
                  }}
                >
                  {location?.name}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                    <MapPin size={13} color="rgba(255,255,255,0.8)" />
                    <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', fontFamily: 'DMSans_400Regular' }}>
                      {location?.address}
                    </Text>
                  </View>
                  {location?.open_hours ? (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                      <Clock size={13} color="rgba(255,255,255,0.8)" />
                      <Text style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', fontFamily: 'DMSans_400Regular' }}>
                        {location.open_hours}
                      </Text>
                    </View>
                  ) : null}
                </View>
              </>
            )}
          </View>
        </View>

        {/* Description */}
        {location?.description ? (
          <View style={{ paddingHorizontal: 20, paddingTop: 20 }}>
            <Text
              style={{
                fontSize: 15,
                color: COLORS.textSecondary,
                fontFamily: 'DMSans_400Regular',
                lineHeight: 22,
              }}
            >
              {location.description}
            </Text>
          </View>
        ) : null}

        {/* Available Pods */}
        {!loading && availablePods.length > 0 && (
          <View style={{ marginTop: 28, paddingHorizontal: 20 }}>
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
              Available Pods
            </Text>
            <View style={{ gap: 12 }}>
              {availablePods.map((pod, index) => {
                const priceText = priceDisplay(pod.price_per_hour);
                const amenities = parseAmenities(pod.amenities);
                return (
                  <AnimatedListItem key={pod.id} index={index}>
                    <AnimatedPressable
                      onPress={() => {
                        console.log('[LocationDetail] Pod pressed, navigating to booking:', pod.id);
                        router.push(`/booking/new?pod_id=${pod.id}`);
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
                        source={resolveImageSource(pod.image_url)}
                        style={{ width: 100, height: 100 }}
                        contentFit="cover"
                      />
                      <View style={{ flex: 1, padding: 12, gap: 5, justifyContent: 'center' }}>
                        <Text
                          style={{
                            fontSize: 15,
                            fontWeight: '700',
                            color: COLORS.text,
                            fontFamily: 'DMSans_700Bold',
                          }}
                          numberOfLines={1}
                        >
                          {pod.name}
                        </Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <StatusBadge status={pod.type} type="pod" />
                          <Text style={{ fontSize: 14, fontWeight: '700', color: COLORS.primary, fontFamily: 'DMSans_700Bold' }}>
                            {priceText}
                          </Text>
                        </View>
                        {amenities.length > 0 && (
                          <View style={{ flexDirection: 'row', gap: 5, flexWrap: 'wrap' }}>
                            {amenities.slice(0, 3).map((a) => {
                              const label = String(a).charAt(0).toUpperCase() + String(a).slice(1);
                              return (
                                <View
                                  key={String(a)}
                                  style={{
                                    backgroundColor: COLORS.surfaceSecondary,
                                    borderRadius: 5,
                                    paddingHorizontal: 7,
                                    paddingVertical: 2,
                                  }}
                                >
                                  <Text style={{ fontSize: 10, color: COLORS.textSecondary, fontFamily: 'DMSans_500Medium' }}>
                                    {label}
                                  </Text>
                                </View>
                              );
                            })}
                          </View>
                        )}
                      </View>
                      <View style={{ justifyContent: 'center', paddingRight: 12 }}>
                        <ChevronRight size={18} color={COLORS.textTertiary} />
                      </View>
                    </AnimatedPressable>
                  </AnimatedListItem>
                );
              })}
            </View>
          </View>
        )}

        {/* Out of service pods */}
        {!loading && outOfServicePods.length > 0 && (
          <View style={{ marginTop: 24, paddingHorizontal: 20 }}>
            <Text
              style={{
                fontSize: 15,
                fontWeight: '600',
                color: COLORS.textSecondary,
                fontFamily: 'DMSans_600SemiBold',
                marginBottom: 10,
              }}
            >
              Unavailable
            </Text>
            <View style={{ gap: 10 }}>
              {outOfServicePods.map((pod) => {
                const priceText = priceDisplay(pod.price_per_hour);
                return (
                  <View
                    key={pod.id}
                    style={{
                      backgroundColor: COLORS.surfaceSecondary,
                      borderRadius: 14,
                      overflow: 'hidden',
                      borderWidth: 1,
                      borderColor: COLORS.border,
                      flexDirection: 'row',
                      opacity: 0.6,
                    }}
                  >
                    <Image
                      source={resolveImageSource(pod.image_url)}
                      style={{ width: 80, height: 80 }}
                      contentFit="cover"
                    />
                    <View style={{ flex: 1, padding: 12, gap: 4, justifyContent: 'center' }}>
                      <Text
                        style={{
                          fontSize: 14,
                          fontWeight: '600',
                          color: COLORS.textTertiary,
                          fontFamily: 'DMSans_600SemiBold',
                        }}
                        numberOfLines={1}
                      >
                        {pod.name}
                      </Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        <View
                          style={{
                            backgroundColor: COLORS.dangerMuted,
                            borderRadius: 6,
                            paddingHorizontal: 8,
                            paddingVertical: 3,
                          }}
                        >
                          <Text style={{ fontSize: 11, color: COLORS.danger, fontFamily: 'DMSans_600SemiBold' }}>
                            Unavailable
                          </Text>
                        </View>
                        <Text style={{ fontSize: 13, color: COLORS.textTertiary, fontFamily: 'DMSans_500Medium' }}>
                          {priceText}
                        </Text>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Loading skeleton */}
        {loading && (
          <View style={{ marginTop: 28, paddingHorizontal: 20, gap: 12 }}>
            {[0, 1, 2].map((i) => (
              <View
                key={i}
                style={{
                  backgroundColor: COLORS.surface,
                  borderRadius: 16,
                  padding: 16,
                  borderWidth: 1,
                  borderColor: COLORS.border,
                  flexDirection: 'row',
                  gap: 12,
                }}
              >
                <SkeletonLine width={80} height={80} borderRadius={12} />
                <View style={{ flex: 1, gap: 8 }}>
                  <SkeletonLine width="70%" height={15} />
                  <SkeletonLine width="50%" height={12} />
                  <SkeletonLine width="60%" height={12} />
                </View>
              </View>
            ))}
          </View>
        )}

        {/* Error state */}
        {error && !loading && (
          <View
            style={{
              margin: 20,
              backgroundColor: COLORS.dangerMuted,
              borderRadius: 16,
              padding: 20,
              alignItems: 'center',
              gap: 8,
            }}
          >
            <Text style={{ fontSize: 15, color: COLORS.danger, fontFamily: 'DMSans_600SemiBold' }}>
              Couldn't load location
            </Text>
            <Text style={{ fontSize: 13, color: COLORS.textSecondary, fontFamily: 'DMSans_400Regular', textAlign: 'center' }}>
              {error}
            </Text>
            <AnimatedPressable
              onPress={() => {
                console.log('[LocationDetail] Retry pressed');
                setLoading(true);
                fetchLocation();
              }}
              style={{
                backgroundColor: COLORS.danger,
                borderRadius: 10,
                paddingVertical: 10,
                paddingHorizontal: 20,
              }}
            >
              <Text style={{ color: '#FFF', fontSize: 14, fontFamily: 'DMSans_600SemiBold' }}>
                Try again
              </Text>
            </AnimatedPressable>
          </View>
        )}

        {/* Empty pods state */}
        {!loading && !error && allPods.length === 0 && (
          <View style={{ alignItems: 'center', paddingTop: 40, paddingHorizontal: 32, gap: 12 }}>
            <Text style={{ fontSize: 16, fontWeight: '600', color: COLORS.text, fontFamily: 'DMSans_600SemiBold', textAlign: 'center' }}>
              No pods at this location
            </Text>
            <Text style={{ fontSize: 14, color: COLORS.textSecondary, fontFamily: 'DMSans_400Regular', textAlign: 'center' }}>
              Check back soon for available pods.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
