import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Image } from 'expo-image';
import { useColors } from '@/hooks/useColors';
import { capsuleGet } from '@/utils/capsuleApi';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { SkeletonLine } from '@/components/SkeletonLoader';
import { StatusBadge } from '@/components/StatusBadge';
import { MapPin, Wifi, Zap, Coffee, Wind, Monitor, Calendar, ChevronDown, ChevronUp } from 'lucide-react-native';

interface PodDetail {
  id: string;
  name: string;
  type: string;
  price_per_hour: number;
  amenities: string | string[];
  image_url: string;
  is_out_of_service: boolean;
  location: {
    name: string;
    address: string;
  };
}

interface BookedSlot {
  start_time: string;
  end_time: string;
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

const AMENITY_ICONS: Record<string, React.ComponentType<{ size: number; color: string }>> = {
  wifi: Wifi,
  power: Zap,
  coffee: Coffee,
  ac: Wind,
  monitor: Monitor,
};

const ALL_SLOTS = [
  '06:00', '06:30', '07:00', '07:30', '08:00', '08:30',
  '09:00', '09:30', '10:00', '10:30', '11:00', '11:30',
  '12:00', '12:30', '13:00', '13:30', '14:00', '14:30',
  '15:00', '15:30', '16:00', '16:30', '17:00', '17:30',
  '18:00', '18:30', '19:00', '19:30', '20:00', '20:30',
  '21:00', '21:30',
];

function formatDateISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function isSlotBooked(timeStr: string, bookedSlots: BookedSlot[]): boolean {
  return bookedSlots.some((slot) => {
    const slotStart = (slot.start_time ?? '').substring(11, 16);
    const slotEnd = (slot.end_time ?? '').substring(11, 16);
    return timeStr >= slotStart && timeStr < slotEnd;
  });
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

export default function PodDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const COLORS = useColors();
  const router = useRouter();

  const [pod, setPod] = useState<PodDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const [availabilityExpanded, setAvailabilityExpanded] = useState(false);
  const [selectedAvailDate, setSelectedAvailDate] = useState<Date>(new Date());
  const [bookedSlots, setBookedSlots] = useState<BookedSlot[]>([]);
  const [availabilityLoading, setAvailabilityLoading] = useState(false);
  const [availabilityFetched, setAvailabilityFetched] = useState(false);

  const fetchPod = useCallback(async () => {
    if (!id) return;
    console.log('[PodDetail] Fetching pod:', id);
    try {
      const data = await capsuleGet<PodDetail>(`/api/pods/${id}`);
      setPod(data);
      setError('');
    } catch (e: unknown) {
      console.error('[PodDetail] Failed to fetch pod:', e);
      setError('Could not load pod details.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  const fetchAvailability = useCallback(async (date: Date) => {
    if (!id) return;
    const dateStr = formatDateISO(date);
    console.log('[PodDetail] Fetching availability for date:', dateStr);
    setAvailabilityLoading(true);
    try {
      const data = await capsuleGet<{ booked_slots: BookedSlot[] }>(
        `/api/pods/${id}/availability?date=${dateStr}`
      );
      setBookedSlots(data.booked_slots || []);
      setAvailabilityFetched(true);
    } catch (e: unknown) {
      console.error('[PodDetail] Failed to fetch availability:', e);
      setBookedSlots([]);
    } finally {
      setAvailabilityLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchPod();
  }, [fetchPod]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchPod();
  }, [fetchPod]);

  const handleToggleAvailability = () => {
    const next = !availabilityExpanded;
    console.log('[PodDetail] Check Availability toggled:', next);
    setAvailabilityExpanded(next);
    if (next && !availabilityFetched) {
      fetchAvailability(selectedAvailDate);
    }
  };

  const handleAvailDateChange = (date: Date) => {
    console.log('[PodDetail] Availability date changed:', formatDateISO(date));
    setSelectedAvailDate(date);
    fetchAvailability(date);
  };

  const priceText = pod ? `$${Number(pod.price_per_hour).toFixed(0)}/hr` : '';
  const amenities = parseAmenities(pod?.amenities);
  const podName = pod?.name ?? 'Pod Details';

  const availDays = Array.from({ length: 7 }, (_, i) => addDays(new Date(), i));
  const freeSlots = ALL_SLOTS.filter((s) => !isSlotBooked(s, bookedSlots));
  const bookedCount = ALL_SLOTS.length - freeSlots.length;
  const availSummaryText = availabilityFetched
    ? `${freeSlots.length} of ${ALL_SLOTS.length} slots free`
    : '';

  return (
    <>
      <Stack.Screen options={{ title: podName }} />
      <ScrollView
        style={{ flex: 1, backgroundColor: COLORS.background }}
        contentContainerStyle={{ paddingBottom: 140 }}
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="automatic"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
        }
      >
        {/* Hero Image */}
        <View style={{ height: 260 }}>
          {loading ? (
            <View style={{ width: '100%', height: '100%', backgroundColor: COLORS.surfaceSecondary }} />
          ) : (
            <Image
              source={resolveImageSource(pod?.image_url)}
              style={{ width: '100%', height: '100%' }}
              contentFit="cover"
            />
          )}
        </View>

        <View style={{ padding: 20, gap: 20 }}>
          {loading ? (
            <View style={{ gap: 12 }}>
              <SkeletonLine width="70%" height={24} />
              <SkeletonLine width="40%" height={16} />
              <SkeletonLine width="60%" height={14} />
            </View>
          ) : error ? (
            <View style={{ alignItems: 'center', gap: 12, paddingVertical: 40 }}>
              <Text style={{ fontSize: 17, fontWeight: '600', color: COLORS.text, fontFamily: 'DMSans_600SemiBold' }}>
                Couldn't load pod
              </Text>
              <Text style={{ fontSize: 14, color: COLORS.textSecondary, fontFamily: 'DMSans_400Regular', textAlign: 'center' }}>
                {error}
              </Text>
              <AnimatedPressable
                onPress={() => {
                  console.log('[PodDetail] Retry pressed');
                  setLoading(true);
                  fetchPod();
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
            <>
              {/* Header row */}
              <View style={{ gap: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                  <Text
                    style={{
                      fontSize: 24,
                      fontWeight: '800',
                      color: COLORS.text,
                      fontFamily: 'DMSans_700Bold',
                      letterSpacing: -0.5,
                      flex: 1,
                      marginRight: 12,
                    }}
                  >
                    {pod?.name}
                  </Text>
                  <Text
                    style={{
                      fontSize: 22,
                      fontWeight: '800',
                      color: COLORS.primary,
                      fontFamily: 'DMSans_700Bold',
                    }}
                  >
                    {priceText}
                  </Text>
                </View>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <StatusBadge status={pod?.type ?? 'standard'} type="pod" />
                  {pod?.is_out_of_service && (
                    <View
                      style={{
                        backgroundColor: COLORS.dangerMuted,
                        borderRadius: 8,
                        paddingHorizontal: 10,
                        paddingVertical: 4,
                      }}
                    >
                      <Text style={{ fontSize: 12, color: COLORS.danger, fontFamily: 'DMSans_600SemiBold' }}>
                        Out of service
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Location info */}
              {pod?.location && (
                <View
                  style={{
                    backgroundColor: COLORS.surface,
                    borderRadius: 14,
                    padding: 16,
                    borderWidth: 1,
                    borderColor: COLORS.border,
                    gap: 8,
                  }}
                >
                  <Text style={{ fontSize: 12, fontWeight: '600', color: COLORS.textTertiary, fontFamily: 'DMSans_600SemiBold', textTransform: 'uppercase', letterSpacing: 0.6 }}>
                    Location
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                    <View
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 10,
                        backgroundColor: COLORS.primaryMuted,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <MapPin size={18} color={COLORS.primary} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 15, fontWeight: '600', color: COLORS.text, fontFamily: 'DMSans_600SemiBold' }}>
                        {pod.location.name}
                      </Text>
                      <Text style={{ fontSize: 13, color: COLORS.textSecondary, fontFamily: 'DMSans_400Regular' }}>
                        {pod.location.address}
                      </Text>
                    </View>
                  </View>
                </View>
              )}

              {/* Amenities */}
              {amenities.length > 0 && (
                <View style={{ gap: 10 }}>
                  <Text
                    style={{
                      fontSize: 17,
                      fontWeight: '700',
                      color: COLORS.text,
                      fontFamily: 'DMSans_700Bold',
                    }}
                  >
                    Amenities
                  </Text>
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                    {amenities.map((amenity) => {
                      const amenityStr = String(amenity);
                      const IconComp = AMENITY_ICONS[amenityStr.toLowerCase()] ?? Zap;
                      const label = amenityStr.charAt(0).toUpperCase() + amenityStr.slice(1);
                      return (
                        <View
                          key={amenityStr}
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 6,
                            backgroundColor: COLORS.surface,
                            borderRadius: 10,
                            paddingHorizontal: 12,
                            paddingVertical: 8,
                            borderWidth: 1,
                            borderColor: COLORS.border,
                          }}
                        >
                          <IconComp size={15} color={COLORS.primary} />
                          <Text style={{ fontSize: 13, color: COLORS.text, fontFamily: 'DMSans_500Medium' }}>
                            {label}
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                </View>
              )}

              {/* Check Availability */}
              {!pod?.is_out_of_service && (
                <View
                  style={{
                    backgroundColor: COLORS.surface,
                    borderRadius: 16,
                    borderWidth: 1,
                    borderColor: availabilityExpanded ? COLORS.primary : COLORS.border,
                    overflow: 'hidden',
                  }}
                >
                  <AnimatedPressable
                    onPress={handleToggleAvailability}
                    style={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: 16,
                    }}
                  >
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                      <View
                        style={{
                          width: 36,
                          height: 36,
                          borderRadius: 10,
                          backgroundColor: availabilityExpanded ? COLORS.primaryMuted : COLORS.surfaceSecondary,
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <Calendar size={18} color={availabilityExpanded ? COLORS.primary : COLORS.textSecondary} />
                      </View>
                      <View>
                        <Text style={{ fontSize: 15, fontWeight: '600', color: COLORS.text, fontFamily: 'DMSans_600SemiBold' }}>
                          Check availability
                        </Text>
                        {availSummaryText ? (
                          <Text style={{ fontSize: 12, color: freeSlots.length > 0 ? COLORS.accent : COLORS.danger, fontFamily: 'DMSans_500Medium' }}>
                            {availSummaryText}
                          </Text>
                        ) : (
                          <Text style={{ fontSize: 12, color: COLORS.textTertiary, fontFamily: 'DMSans_400Regular' }}>
                            See open time slots
                          </Text>
                        )}
                      </View>
                    </View>
                    {availabilityExpanded
                      ? <ChevronUp size={18} color={COLORS.textSecondary} />
                      : <ChevronDown size={18} color={COLORS.textSecondary} />
                    }
                  </AnimatedPressable>

                  {availabilityExpanded && (
                    <View style={{ paddingHorizontal: 16, paddingBottom: 16, gap: 14 }}>
                      <View style={{ height: 1, backgroundColor: COLORS.divider }} />
                      <ScrollView
                        horizontal
                        showsHorizontalScrollIndicator={false}
                        style={{ marginHorizontal: -16 }}
                        contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
                      >
                        {availDays.map((day, i) => {
                          const isSelected = formatDateISO(day) === formatDateISO(selectedAvailDate);
                          const shortLabel = i === 0 ? 'Today' : i === 1 ? 'Tmrw' : day.toLocaleDateString('en-US', { weekday: 'short' });
                          const dayNum = day.getDate();
                          return (
                            <AnimatedPressable
                              key={i}
                              onPress={() => handleAvailDateChange(day)}
                              style={{
                                paddingHorizontal: 14,
                                paddingVertical: 10,
                                borderRadius: 12,
                                alignItems: 'center',
                                gap: 2,
                                backgroundColor: isSelected ? COLORS.primary : COLORS.surfaceSecondary,
                                minWidth: 56,
                              }}
                            >
                              <Text style={{ fontSize: 10, fontWeight: '600', color: isSelected ? 'rgba(255,255,255,0.75)' : COLORS.textTertiary, fontFamily: 'DMSans_600SemiBold' }}>
                                {shortLabel}
                              </Text>
                              <Text style={{ fontSize: 17, fontWeight: '700', color: isSelected ? '#FFFFFF' : COLORS.text, fontFamily: 'DMSans_700Bold' }}>
                                {dayNum}
                              </Text>
                            </AnimatedPressable>
                          );
                        })}
                      </ScrollView>

                      {availabilityLoading ? (
                        <View style={{ alignItems: 'center', paddingVertical: 16 }}>
                          <ActivityIndicator color={COLORS.primary} />
                        </View>
                      ) : (
                        <View style={{ gap: 10 }}>
                          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 6 }}>
                            {ALL_SLOTS.map((slot) => {
                              const booked = isSlotBooked(slot, bookedSlots);
                              return (
                                <View
                                  key={slot}
                                  style={{
                                    paddingHorizontal: 10,
                                    paddingVertical: 6,
                                    borderRadius: 8,
                                    backgroundColor: booked ? COLORS.surfaceSecondary : COLORS.accentMuted,
                                    borderWidth: 1,
                                    borderColor: booked ? COLORS.border : COLORS.accent,
                                    opacity: booked ? 0.5 : 1,
                                  }}
                                >
                                  <Text
                                    style={{
                                      fontSize: 12,
                                      fontWeight: '600',
                                      color: booked ? COLORS.textTertiary : COLORS.accent,
                                      fontFamily: 'DMSans_600SemiBold',
                                    }}
                                  >
                                    {slot}
                                  </Text>
                                </View>
                              );
                            })}
                          </View>
                          {bookedCount > 0 && (
                            <Text style={{ fontSize: 12, color: COLORS.textTertiary, fontFamily: 'DMSans_400Regular' }}>
                              {bookedCount}
                              {bookedCount === 1 ? ' slot' : ' slots'}
                              {' already booked'}
                            </Text>
                          )}
                        </View>
                      )}
                    </View>
                  )}
                </View>
              )}
            </>
          )}
        </View>
      </ScrollView>

      {/* Bottom action bar */}
      {!loading && !error && pod && !pod.is_out_of_service && (
        <View
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            padding: 16,
            paddingBottom: 32,
            backgroundColor: COLORS.background,
            borderTopWidth: 1,
            borderTopColor: COLORS.border,
            flexDirection: 'row',
            gap: 12,
          }}
        >
          <AnimatedPressable
            onPress={handleToggleAvailability}
            style={{
              flex: 1,
              backgroundColor: COLORS.surfaceSecondary,
              borderRadius: 14,
              paddingVertical: 16,
              alignItems: 'center',
              flexDirection: 'row',
              justifyContent: 'center',
              gap: 8,
              borderWidth: 1,
              borderColor: availabilityExpanded ? COLORS.primary : COLORS.border,
            }}
          >
            <Calendar size={17} color={availabilityExpanded ? COLORS.primary : COLORS.textSecondary} />
            <Text
              style={{
                color: availabilityExpanded ? COLORS.primary : COLORS.text,
                fontSize: 15,
                fontWeight: '600',
                fontFamily: 'DMSans_600SemiBold',
              }}
            >
              Availability
            </Text>
          </AnimatedPressable>

          <AnimatedPressable
            onPress={() => {
              console.log('[PodDetail] Book Now pressed for pod:', id);
              router.push(`/booking/new?pod_id=${id}`);
            }}
            style={{
              flex: 2,
              backgroundColor: '#1B2B4B',
              borderRadius: 14,
              paddingVertical: 16,
              alignItems: 'center',
            }}
          >
            <Text
              style={{
                color: '#FFFFFF',
                fontSize: 16,
                fontWeight: '700',
                fontFamily: 'DMSans_700Bold',
              }}
            >
              Book Now
            </Text>
          </AnimatedPressable>
        </View>
      )}
    </>
  );
}
