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
import { apiGet } from '@/utils/api';
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
  amenities: string[];
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



export default function LocationDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();
  const COLORS = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [location, setLocation] = useState<LocationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [, setError] = useState('');

  const fetchLocation = useCallback(async () => {
    if (!slug) return;
    console.log('[LocationDetail] Fetching location:', slug);
    try {
      const data = await apiGet<LocationDetail>(`/api/locations/${slug}`);
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
        <View style={{ height: 300, position: 'relative' }}>
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
                    marginBottom: 4,
                  }}
                >
                  {location?.name}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
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

        {/* Available Pods — horizontal scroll */}
        {availablePods.length > 0 && (
          <View style={{ marginTop: 28 }}>
            <Text
              style={{
                fontSize: 19,
                fontWeight: '700',
                color: COLORS.text,
                fontFamily: 'DMSans_700Bold',
                letterSpacing: -0.3,
                paddingHorizontal: 20,
                marginBottom: 14,
              }}
            >
              Available Pods
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 20, gap: 12 }}
            >
              {availablePods.map((pod, index) => {
                const priceText = priceDisplay(pod.price_per_hour);
                return (
                  <AnimatedListItem key={pod.id} index={index}>
                    <AnimatedPressable
                      onPress={() => {
                        console.log('[LocationDetail] Available pod pressed:', pod.id);
                        router.push(`/(tabs)/pod/${pod.id}`);
                      }}
                      style={{
                        width: 180,
                        backgroundColor: COLORS.surface,
                        borderRadius: 16,
                        overflow: 'hidden',
                        borderWidth: 1,
                        borderColor: COLORS.border,
                        boxShadow: COLORS.cardShadow,
                      }}
                    >
                      <Image
                        source={resolveImageSource(pod.image_url)}
                        style={{ width: '100%', height: 110 }}
                        contentFit="cover"
                      />
                      <View style={{ padding: 12, gap: 6 }}>
                        <Text
                          style={{
                            fontSize: 14,
                            fontWeight: '700',
                            color: COLORS.text,
                            fontFamily: 'DMSans_700Bold',
                          }}
                          numberOfLines={1}
                        >
                          {pod.name}
                        </Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                          <StatusBadge status={pod.type} type="pod" />
                          <Text style={{ fontSize: 13, fontWeight: '700', color: COLORS.primary, fontFamily: 'DMSans_700Bold' }}>
                            {priceText}
                          </Text>
                        </View>
                      </View>
                    </AnimatedPressable>
                  </AnimatedListItem>
                );
              })}
            </ScrollView>
          </View>
        )}

        {/* All Pods — vertical list */}
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
            All Pods
          </Text>

          {loading ? (
            <View style={{ gap: 12 }}>
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
          ) : (
            <View style={{ gap: 12 }}>
              {allPods.map((pod, index) => {
                const priceText = priceDisplay(pod.price_per_hour);
                const amenities = Array.isArray(pod.amenities) ? pod.amenities : [];
                return (
                  <AnimatedListItem key={pod.id} index={index}>
                    <AnimatedPressable
                      onPress={() => {
                        console.log('[LocationDetail] Pod pressed:', pod.id);
                        router.push(`/(tabs)/pod/${pod.id}`);
                      }}
                      style={{
                        backgroundColor: pod.is_out_of_service ? COLORS.surfaceSecondary : COLORS.surface,
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
                        style={{ width: 90, height: 90 }}
                        contentFit="cover"
                      />
                      <View style={{ flex: 1, padding: 12, gap: 5, justifyContent: 'center' }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <Text
                            style={{
                              fontSize: 15,
                              fontWeight: '700',
                              color: pod.is_out_of_service ? COLORS.textTertiary : COLORS.text,
                              fontFamily: 'DMSans_700Bold',
                              flex: 1,
                            }}
                            numberOfLines={1}
                          >
                            {pod.name}
                          </Text>
                          {pod.is_out_of_service && (
                            <View
                              style={{
                                backgroundColor: COLORS.dangerMuted,
                                borderRadius: 6,
                                paddingHorizontal: 7,
                                paddingVertical: 2,
                              }}
                            >
                              <Text style={{ fontSize: 10, color: COLORS.danger, fontFamily: 'DMSans_600SemiBold' }}>
                                Unavailable
                              </Text>
                            </View>
                          )}
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <StatusBadge status={pod.type} type="pod" />
                          <Text style={{ fontSize: 13, fontWeight: '700', color: COLORS.primary, fontFamily: 'DMSans_700Bold' }}>
                            {priceText}
                          </Text>
                        </View>
                        {amenities.length > 0 && (
                          <View style={{ flexDirection: 'row', gap: 6, flexWrap: 'wrap', marginTop: 2 }}>
                            {amenities.slice(0, 3).map((a) => (
                              <View
                                key={a}
                                style={{
                                  backgroundColor: COLORS.surfaceSecondary,
                                  borderRadius: 6,
                                  paddingHorizontal: 7,
                                  paddingVertical: 2,
                                }}
                              >
                                <Text style={{ fontSize: 10, color: COLORS.textSecondary, fontFamily: 'DMSans_500Medium' }}>
                                  {String(a).charAt(0).toUpperCase() + String(a).slice(1)}
                                </Text>
                              </View>
                            ))}
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
          )}
        </View>
      </ScrollView>
    </View>
  );
}
