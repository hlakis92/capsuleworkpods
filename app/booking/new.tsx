import { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  Animated,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Linking from 'expo-linking';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/contexts/AuthContext';
import { capsuleGet, capsulePost } from '@/utils/capsuleApi';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { Check, ChevronLeft, ChevronRight, X, Calendar, Clock, Zap } from 'lucide-react-native';

interface AvailabilitySlot {
  start_time: string;
  end_time: string;
}

interface MembershipDiscount {
  tier: string;
  discount_percent: number;
}

interface BookingResult {
  id: string;
  status: string;
  price_base: number;
  discount_percent: number;
  price_final: number;
  payment_status: string;
}

interface PodInfo {
  id: string;
  name: string;
  price_per_hour: number;
  type: string;
  location?: { name: string };
}

const DURATIONS = [
  { label: '30m', hours: 0.5 },
  { label: '1h', hours: 1 },
  { label: '1.5h', hours: 1.5 },
  { label: '2h', hours: 2 },
  { label: '3h', hours: 3 },
  { label: '4h', hours: 4 },
  { label: '6h', hours: 6 },
  { label: '8h', hours: 8 },
];

// 6 AM to 10 PM in 30-min intervals
const TIME_SLOTS: string[] = [];
for (let h = 6; h <= 22; h++) {
  TIME_SLOTS.push(`${String(h).padStart(2, '0')}:00`);
  if (h < 22) TIME_SLOTS.push(`${String(h).padStart(2, '0')}:30`);
}

function formatDateISO(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function buildDateTimeISO(date: Date, timeStr: string): string {
  const iso = formatDateISO(date);
  return `${iso}T${timeStr}:00`;
}

function addMinutesToTime(timeStr: string, minutes: number): string {
  const [h, m] = timeStr.split(':').map(Number);
  const totalMins = h * 60 + m + minutes;
  const newH = Math.floor(totalMins / 60) % 24;
  const newM = totalMins % 60;
  return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}`;
}

function isSlotBooked(timeStr: string, bookedSlots: AvailabilitySlot[]): boolean {
  return bookedSlots.some((slot) => {
    const slotStart = slot.start_time?.substring(11, 16);
    const slotEnd = slot.end_time?.substring(11, 16);
    return timeStr >= slotStart && timeStr < slotEnd;
  });
}

function formatDisplayDate(date: Date): string {
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
}

function formatTime12(timeStr: string): string {
  const [h, m] = timeStr.split(':').map(Number);
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, '0')} ${period}`;
}

export default function BookingNewScreen() {
  const { pod_id } = useLocalSearchParams<{ pod_id: string }>();
  const COLORS = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [step, setStep] = useState(1);
  const [pod, setPod] = useState<PodInfo | null>(null);
  const [podLoading, setPodLoading] = useState(true);

  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [selectedDuration, setSelectedDuration] = useState<number>(1);
  const [bookedSlots, setBookedSlots] = useState<AvailabilitySlot[]>([]);
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  const [membershipDiscount, setMembershipDiscount] = useState(0);

  const [submitting, setSubmitting] = useState(false);
  const [bookingResult, setBookingResult] = useState<BookingResult | null>(null);
  const [checkoutUrl, setCheckoutUrl] = useState('');
  const [error, setError] = useState('');

  const slideAnim = useRef(new Animated.Value(0)).current;

  const fetchPod = useCallback(async () => {
    if (!pod_id) return;
    console.log('[BookingNew] Fetching pod info:', pod_id);
    try {
      const data = await capsuleGet<PodInfo>(`/api/pods/${pod_id}`);
      setPod(data);
    } catch (e) {
      console.error('[BookingNew] Failed to fetch pod:', e);
    } finally {
      setPodLoading(false);
    }
  }, [pod_id]);

  const fetchMembershipDiscount = useCallback(async () => {
    if (!user) return;
    console.log('[BookingNew] Fetching membership discounts');
    try {
      const data = await capsuleGet<{ discounts: MembershipDiscount[] }>('/api/membership-discounts');
      const discounts = data.discounts || [];
      if (discounts.length > 0) {
        setMembershipDiscount(discounts[0].discount_percent ?? 0);
      }
    } catch (e) {
      console.error('[BookingNew] Failed to fetch discounts:', e);
    }
  }, [user]);

  const fetchAvailability = useCallback(async (date: Date) => {
    if (!pod_id) return;
    const dateStr = formatDateISO(date);
    console.log('[BookingNew] Fetching availability for pod:', pod_id, 'date:', dateStr);
    setLoadingAvailability(true);
    try {
      const data = await capsuleGet<{ booked_slots: AvailabilitySlot[] }>(
        `/api/pods/${pod_id}/availability?date=${dateStr}`
      );
      setBookedSlots(data.booked_slots || []);
    } catch (e) {
      console.error('[BookingNew] Failed to fetch availability:', e);
      setBookedSlots([]);
    } finally {
      setLoadingAvailability(false);
    }
  }, [pod_id]);

  useEffect(() => {
    fetchPod();
    fetchMembershipDiscount();
  }, [fetchPod, fetchMembershipDiscount]);

  useEffect(() => {
    fetchAvailability(selectedDate);
  }, [selectedDate, fetchAvailability]);

  const animateStep = () => {
    slideAnim.setValue(24);
    Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, speed: 20, bounciness: 3 }).start();
  };

  const goNext = () => {
    console.log('[BookingNew] Next step from:', step);
    animateStep();
    setStep((s) => s + 1);
  };

  const goBack = () => {
    if (step === 1) {
      console.log('[BookingNew] Close wizard');
      router.back();
      return;
    }
    console.log('[BookingNew] Back step from:', step);
    animateStep();
    setStep((s) => s - 1);
  };

  const handleConfirm = async () => {
    if (!pod_id || !selectedTime || !selectedDate) return;
    if (!user) {
      console.log('[BookingNew] Not logged in, redirecting to auth');
      router.push('/auth-screen');
      return;
    }

    const startISO = buildDateTimeISO(selectedDate, selectedTime);
    const durationMinutes = selectedDuration * 60;
    const endTime = addMinutesToTime(selectedTime, durationMinutes);
    const endISO = buildDateTimeISO(selectedDate, endTime);

    console.log('[BookingNew] Creating booking:', { pod_id, startISO, endISO, duration: selectedDuration });
    setSubmitting(true);
    setError('');
    try {
      const booking = await capsulePost<BookingResult>('/api/bookings', {
        pod_id,
        start_time: startISO,
        end_time: endISO,
        duration: selectedDuration,
        actual_minutes: durationMinutes,
      });
      console.log('[BookingNew] Booking created:', booking.id);
      setBookingResult(booking);

      console.log('[BookingNew] Fetching checkout URL for booking:', booking.id);
      const checkout = await capsulePost<{ checkout_url: string; url?: string }>('/api/checkout', {
        booking_id: booking.id,
      });
      const url = checkout.checkout_url || checkout.url || '';
      setCheckoutUrl(url);
      setStep(4);
    } catch (e: unknown) {
      const err = e as { message?: string };
      console.error('[BookingNew] Booking failed:', e);
      const msg = err?.message || 'Failed to create booking.';
      if (msg.includes('409') || msg.toLowerCase().includes('conflict')) {
        setError('This time slot was just booked. Please choose a different time.');
      } else {
        setError(msg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handlePayNow = async () => {
    if (!checkoutUrl) return;
    console.log('[BookingNew] Opening checkout URL');
    await Linking.openURL(checkoutUrl);
  };

  const handleViewBooking = () => {
    if (!bookingResult?.id) return;
    console.log('[BookingNew] View booking pressed:', bookingResult.id);
    router.replace(`/booking/${bookingResult.id}`);
  };

  const calendarDays = Array.from({ length: 30 }, (_, i) => addDays(new Date(), i));

  const priceNum = Number(pod?.price_per_hour) || 0;
  const basePrice = priceNum * selectedDuration;
  const discountAmt = basePrice * (membershipDiscount / 100);
  const finalPrice = basePrice - discountAmt;

  const basePriceDisplay = `$${basePrice.toFixed(2)}`;
  const discountDisplay = membershipDiscount > 0 ? `-$${discountAmt.toFixed(2)}` : null;
  const finalPriceDisplay = `$${finalPrice.toFixed(2)}`;

  const endTimeDisplay = selectedTime ? addMinutesToTime(selectedTime, selectedDuration * 60) : '';
  const dateDisplay = formatDisplayDate(selectedDate);

  const canProceedStep1 = selectedTime !== null;
  const canProceedStep2 = selectedDuration > 0;

  const stepTitles = ['Select date & time', 'Choose duration', 'Review booking', 'Booking created'];
  const currentTitle = stepTitles[step - 1] ?? 'Book Pod';

  return (
    <>
      <Stack.Screen
        options={{
          title: currentTitle,
          headerLeft: () => (
            <AnimatedPressable onPress={goBack} style={{ padding: 4 }}>
              {step === 1 ? (
                <X size={22} color={COLORS.text} />
              ) : step === 4 ? null : (
                <ChevronLeft size={22} color={COLORS.text} />
              )}
            </AnimatedPressable>
          ),
        }}
      />

      <View style={{ flex: 1, backgroundColor: COLORS.background }}>
        {/* Progress bar */}
        <View
          style={{
            flexDirection: 'row',
            paddingHorizontal: 20,
            paddingTop: 12,
            paddingBottom: 8,
            gap: 6,
          }}
        >
          {[1, 2, 3, 4].map((s) => (
            <View
              key={s}
              style={{
                flex: 1,
                height: 3,
                borderRadius: 2,
                backgroundColor: s <= step ? '#1B2B4B' : COLORS.surfaceSecondary,
              }}
            />
          ))}
        </View>

        <Animated.View style={{ flex: 1, transform: [{ translateY: slideAnim }] }}>
          <ScrollView
            contentContainerStyle={{ padding: 20, paddingBottom: 120, gap: 20 }}
            showsVerticalScrollIndicator={false}
          >
            {/* Pod info header */}
            {!podLoading && pod && step < 4 && (
              <View
                style={{
                  backgroundColor: COLORS.primaryMuted,
                  borderRadius: 12,
                  padding: 12,
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: 10,
                }}
              >
                <View
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    backgroundColor: '#1B2B4B',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Calendar size={18} color="#FFFFFF" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '700', color: COLORS.text, fontFamily: 'DMSans_700Bold' }} numberOfLines={1}>
                    {pod.name}
                  </Text>
                  {pod.location?.name ? (
                    <Text style={{ fontSize: 12, color: COLORS.textSecondary, fontFamily: 'DMSans_400Regular' }}>
                      {pod.location.name}
                    </Text>
                  ) : null}
                </View>
                <Text style={{ fontSize: 15, fontWeight: '700', color: COLORS.primary, fontFamily: 'DMSans_700Bold' }}>
                  ${priceNum.toFixed(0)}/hr
                </Text>
              </View>
            )}

            {/* STEP 1: Date & Time */}
            {step === 1 && (
              <View style={{ gap: 20 }}>
                <View style={{ gap: 4 }}>
                  <Text style={{ fontSize: 22, fontWeight: '800', color: COLORS.text, fontFamily: 'DMSans_700Bold', letterSpacing: -0.5 }}>
                    Choose date & time
                  </Text>
                  <Text style={{ fontSize: 14, color: COLORS.textSecondary, fontFamily: 'DMSans_400Regular' }}>
                    Select when you'd like to work
                  </Text>
                </View>

                {/* Date picker */}
                <View style={{ gap: 10 }}>
                  <Text style={{ fontSize: 15, fontWeight: '600', color: COLORS.text, fontFamily: 'DMSans_600SemiBold' }}>
                    Select date
                  </Text>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    style={{ marginHorizontal: -20 }}
                    contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}
                  >
                    {calendarDays.map((day, i) => {
                      const isSelected = formatDateISO(day) === formatDateISO(selectedDate);
                      const dayName = day.toLocaleDateString('en-US', { weekday: 'short' });
                      const dayNum = day.getDate();
                      const monthName = day.toLocaleDateString('en-US', { month: 'short' });
                      return (
                        <AnimatedPressable
                          key={i}
                          onPress={() => {
                            console.log('[BookingNew] Date selected:', formatDateISO(day));
                            setSelectedDate(day);
                            setSelectedTime(null);
                          }}
                          style={{
                            width: 56,
                            paddingVertical: 12,
                            borderRadius: 14,
                            alignItems: 'center',
                            gap: 2,
                            backgroundColor: isSelected ? '#1B2B4B' : COLORS.surface,
                            borderWidth: 1,
                            borderColor: isSelected ? '#1B2B4B' : COLORS.border,
                          }}
                        >
                          <Text style={{ fontSize: 10, fontWeight: '600', color: isSelected ? 'rgba(255,255,255,0.7)' : COLORS.textTertiary, fontFamily: 'DMSans_600SemiBold' }}>
                            {dayName}
                          </Text>
                          <Text style={{ fontSize: 18, fontWeight: '700', color: isSelected ? '#FFFFFF' : COLORS.text, fontFamily: 'DMSans_700Bold' }}>
                            {dayNum}
                          </Text>
                          <Text style={{ fontSize: 9, color: isSelected ? 'rgba(255,255,255,0.6)' : COLORS.textTertiary, fontFamily: 'DMSans_400Regular' }}>
                            {monthName}
                          </Text>
                        </AnimatedPressable>
                      );
                    })}
                  </ScrollView>
                </View>

                {/* Time slots */}
                <View style={{ gap: 10 }}>
                  <Text style={{ fontSize: 15, fontWeight: '600', color: COLORS.text, fontFamily: 'DMSans_600SemiBold' }}>
                    Select start time
                  </Text>
                  {loadingAvailability ? (
                    <View style={{ alignItems: 'center', paddingVertical: 20 }}>
                      <ActivityIndicator color={COLORS.primary} />
                      <Text style={{ fontSize: 13, color: COLORS.textTertiary, fontFamily: 'DMSans_400Regular', marginTop: 8 }}>
                        Checking availability...
                      </Text>
                    </View>
                  ) : (
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                      {TIME_SLOTS.map((time) => {
                        const booked = isSlotBooked(time, bookedSlots);
                        const isSelected = selectedTime === time;
                        return (
                          <TouchableOpacity
                            key={time}
                            onPress={() => {
                              if (booked) return;
                              console.log('[BookingNew] Time selected:', time);
                              setSelectedTime(time);
                            }}
                            disabled={booked}
                            style={{
                              paddingHorizontal: 14,
                              paddingVertical: 10,
                              borderRadius: 12,
                              backgroundColor: booked
                                ? COLORS.surfaceSecondary
                                : isSelected
                                ? '#1B2B4B'
                                : COLORS.surface,
                              borderWidth: 1,
                              borderColor: booked
                                ? COLORS.border
                                : isSelected
                                ? '#1B2B4B'
                                : COLORS.border,
                              opacity: booked ? 0.45 : 1,
                            }}
                          >
                            <Text
                              style={{
                                fontSize: 13,
                                fontWeight: '600',
                                color: booked
                                  ? COLORS.textTertiary
                                  : isSelected
                                  ? '#FFFFFF'
                                  : COLORS.text,
                                fontFamily: 'DMSans_600SemiBold',
                              }}
                            >
                              {formatTime12(time)}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  )}
                  <View style={{ flexDirection: 'row', gap: 16, marginTop: 4 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: COLORS.surface, borderWidth: 1, borderColor: COLORS.border }} />
                      <Text style={{ fontSize: 11, color: COLORS.textTertiary, fontFamily: 'DMSans_400Regular' }}>Available</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                      <View style={{ width: 10, height: 10, borderRadius: 3, backgroundColor: COLORS.surfaceSecondary, opacity: 0.45 }} />
                      <Text style={{ fontSize: 11, color: COLORS.textTertiary, fontFamily: 'DMSans_400Regular' }}>Booked</Text>
                    </View>
                  </View>
                </View>
              </View>
            )}

            {/* STEP 2: Duration */}
            {step === 2 && (
              <View style={{ gap: 20 }}>
                <View style={{ gap: 4 }}>
                  <Text style={{ fontSize: 22, fontWeight: '800', color: COLORS.text, fontFamily: 'DMSans_700Bold', letterSpacing: -0.5 }}>
                    How long?
                  </Text>
                  <Text style={{ fontSize: 14, color: COLORS.textSecondary, fontFamily: 'DMSans_400Regular' }}>
                    {dateDisplay}
                    {' at '}
                    {selectedTime ? formatTime12(selectedTime) : ''}
                  </Text>
                </View>

                <View style={{ flexDirection: 'row', gap: 10, flexWrap: 'wrap' }}>
                  {DURATIONS.map((d) => {
                    const isSelected = selectedDuration === d.hours;
                    const price = priceNum * d.hours;
                    const discounted = price * (1 - membershipDiscount / 100);
                    const priceStr = `$${price.toFixed(0)}`;
                    const discountedStr = membershipDiscount > 0 ? `$${discounted.toFixed(0)}` : null;
                    return (
                      <AnimatedPressable
                        key={d.hours}
                        onPress={() => {
                          console.log('[BookingNew] Duration selected:', d.hours, 'hours');
                          setSelectedDuration(d.hours);
                        }}
                        style={{
                          width: '47%',
                          paddingVertical: 18,
                          borderRadius: 16,
                          alignItems: 'center',
                          gap: 4,
                          backgroundColor: isSelected ? '#1B2B4B' : COLORS.surface,
                          borderWidth: 1.5,
                          borderColor: isSelected ? '#1B2B4B' : COLORS.border,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 22,
                            fontWeight: '800',
                            color: isSelected ? '#FFFFFF' : COLORS.text,
                            fontFamily: 'DMSans_700Bold',
                          }}
                        >
                          {d.label}
                        </Text>
                        {discountedStr ? (
                          <View style={{ alignItems: 'center' }}>
                            <Text style={{ fontSize: 13, color: isSelected ? 'rgba(255,255,255,0.5)' : COLORS.textTertiary, fontFamily: 'DMSans_400Regular', textDecorationLine: 'line-through' }}>
                              {priceStr}
                            </Text>
                            <Text style={{ fontSize: 14, color: isSelected ? '#F59E0B' : COLORS.accent, fontFamily: 'DMSans_700Bold' }}>
                              {discountedStr}
                            </Text>
                          </View>
                        ) : (
                          <Text style={{ fontSize: 14, color: isSelected ? 'rgba(255,255,255,0.75)' : COLORS.textSecondary, fontFamily: 'DMSans_500Medium' }}>
                            {priceStr}
                          </Text>
                        )}
                      </AnimatedPressable>
                    );
                  })}
                </View>

                {membershipDiscount > 0 && (
                  <View
                    style={{
                      backgroundColor: COLORS.accentMuted,
                      borderRadius: 12,
                      padding: 12,
                      flexDirection: 'row',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    <Zap size={16} color={COLORS.accent} />
                    <Text style={{ fontSize: 13, color: COLORS.accent, fontFamily: 'DMSans_600SemiBold' }}>
                      {membershipDiscount}% membership discount applied
                    </Text>
                  </View>
                )}

                <View
                  style={{
                    backgroundColor: COLORS.primaryMuted,
                    borderRadius: 14,
                    padding: 16,
                    gap: 4,
                  }}
                >
                  <Text style={{ fontSize: 13, color: COLORS.primary, fontFamily: 'DMSans_600SemiBold' }}>
                    Session summary
                  </Text>
                  <Text style={{ fontSize: 15, color: COLORS.text, fontFamily: 'DMSans_500Medium' }}>
                    {dateDisplay}
                    {' · '}
                    {selectedTime ? formatTime12(selectedTime) : ''}
                    {' – '}
                    {endTimeDisplay ? formatTime12(endTimeDisplay) : ''}
                  </Text>
                  <Text style={{ fontSize: 22, fontWeight: '800', color: '#1B2B4B', fontFamily: 'DMSans_700Bold', marginTop: 4 }}>
                    {finalPriceDisplay}
                  </Text>
                </View>
              </View>
            )}

            {/* STEP 3: Review */}
            {step === 3 && (
              <View style={{ gap: 20 }}>
                <Text style={{ fontSize: 22, fontWeight: '800', color: COLORS.text, fontFamily: 'DMSans_700Bold', letterSpacing: -0.5 }}>
                  Review booking
                </Text>

                <View
                  style={{
                    backgroundColor: COLORS.surface,
                    borderRadius: 16,
                    overflow: 'hidden',
                    borderWidth: 1,
                    borderColor: COLORS.border,
                  }}
                >
                  <View style={{ padding: 16, gap: 14 }}>
                    <Text style={{ fontSize: 18, fontWeight: '700', color: COLORS.text, fontFamily: 'DMSans_700Bold' }}>
                      {pod?.name ?? 'Pod'}
                    </Text>

                    <View style={{ gap: 10 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        <Calendar size={16} color={COLORS.textSecondary} />
                        <Text style={{ fontSize: 14, color: COLORS.text, fontFamily: 'DMSans_500Medium' }}>
                          {dateDisplay}
                        </Text>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        <Clock size={16} color={COLORS.textSecondary} />
                        <Text style={{ fontSize: 14, color: COLORS.text, fontFamily: 'DMSans_500Medium' }}>
                          {selectedTime ? formatTime12(selectedTime) : ''}
                          {' – '}
                          {endTimeDisplay ? formatTime12(endTimeDisplay) : ''}
                          {' ('}
                          {selectedDuration}
                          {selectedDuration === 1 ? ' hour)' : ' hours)'}
                        </Text>
                      </View>
                    </View>

                    <View style={{ height: 1, backgroundColor: COLORS.divider }} />

                    <View style={{ gap: 8 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Text style={{ fontSize: 14, color: COLORS.textSecondary, fontFamily: 'DMSans_400Regular' }}>
                          {selectedDuration}
                          {selectedDuration === 1 ? ' hour' : ' hours'}
                          {' × $'}
                          {priceNum.toFixed(0)}
                          {'/hr'}
                        </Text>
                        <Text style={{ fontSize: 14, color: COLORS.text, fontFamily: 'DMSans_500Medium' }}>
                          {basePriceDisplay}
                        </Text>
                      </View>
                      {discountDisplay && (
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                          <Text style={{ fontSize: 14, color: COLORS.accent, fontFamily: 'DMSans_500Medium' }}>
                            Membership discount (
                            {membershipDiscount}
                            %)
                          </Text>
                          <Text style={{ fontSize: 14, color: COLORS.accent, fontFamily: 'DMSans_600SemiBold' }}>
                            {discountDisplay}
                          </Text>
                        </View>
                      )}
                      <View style={{ height: 1, backgroundColor: COLORS.divider }} />
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={{ fontSize: 16, fontWeight: '700', color: COLORS.text, fontFamily: 'DMSans_700Bold' }}>
                          Total
                        </Text>
                        <Text style={{ fontSize: 22, fontWeight: '800', color: '#1B2B4B', fontFamily: 'DMSans_700Bold' }}>
                          {finalPriceDisplay}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>

                {!user && (
                  <View
                    style={{
                      backgroundColor: COLORS.warningMuted,
                      borderRadius: 12,
                      padding: 14,
                      gap: 10,
                    }}
                  >
                    <Text style={{ fontSize: 14, color: COLORS.text, fontFamily: 'DMSans_600SemiBold' }}>
                      Sign in to complete booking
                    </Text>
                    <Text style={{ fontSize: 13, color: COLORS.textSecondary, fontFamily: 'DMSans_400Regular' }}>
                      You need to be signed in to book a pod.
                    </Text>
                    <AnimatedPressable
                      onPress={() => {
                        console.log('[BookingNew] Sign in to book pressed');
                        router.push('/auth-screen');
                      }}
                      style={{
                        backgroundColor: '#1B2B4B',
                        borderRadius: 10,
                        paddingVertical: 12,
                        alignItems: 'center',
                      }}
                    >
                      <Text style={{ color: '#FFFFFF', fontSize: 14, fontFamily: 'DMSans_600SemiBold' }}>
                        Sign in to continue
                      </Text>
                    </AnimatedPressable>
                  </View>
                )}

                {error ? (
                  <View
                    style={{
                      backgroundColor: COLORS.dangerMuted,
                      borderRadius: 12,
                      padding: 14,
                    }}
                  >
                    <Text style={{ fontSize: 14, color: COLORS.danger, fontFamily: 'DMSans_500Medium' }}>
                      {error}
                    </Text>
                  </View>
                ) : null}
              </View>
            )}

            {/* STEP 4: Success */}
            {step === 4 && (
              <View style={{ gap: 24, alignItems: 'center', paddingTop: 20 }}>
                <View
                  style={{
                    width: 80,
                    height: 80,
                    borderRadius: 40,
                    backgroundColor: COLORS.accentMuted,
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Check size={36} color={COLORS.accent} strokeWidth={2.5} />
                </View>

                <View style={{ alignItems: 'center', gap: 8 }}>
                  <Text style={{ fontSize: 24, fontWeight: '800', color: COLORS.text, fontFamily: 'DMSans_700Bold', letterSpacing: -0.5, textAlign: 'center' }}>
                    Booking created!
                  </Text>
                  <Text style={{ fontSize: 15, color: COLORS.textSecondary, fontFamily: 'DMSans_400Regular', textAlign: 'center', lineHeight: 22 }}>
                    Your pod is reserved. Complete payment to confirm your booking.
                  </Text>
                </View>

                {bookingResult && (
                  <View
                    style={{
                      backgroundColor: COLORS.surface,
                      borderRadius: 16,
                      padding: 16,
                      borderWidth: 1,
                      borderColor: COLORS.border,
                      width: '100%',
                      gap: 10,
                    }}
                  >
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ fontSize: 13, color: COLORS.textSecondary, fontFamily: 'DMSans_400Regular' }}>
                        Booking ID
                      </Text>
                      <Text style={{ fontSize: 13, color: COLORS.text, fontFamily: 'DMSans_600SemiBold' }} selectable>
                        {bookingResult.id.slice(0, 8).toUpperCase()}
                      </Text>
                    </View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                      <Text style={{ fontSize: 13, color: COLORS.textSecondary, fontFamily: 'DMSans_400Regular' }}>
                        Total
                      </Text>
                      <Text style={{ fontSize: 13, color: COLORS.primary, fontFamily: 'DMSans_700Bold' }}>
                        {`$${Number(bookingResult.price_final).toFixed(2)}`}
                      </Text>
                    </View>
                  </View>
                )}

                {checkoutUrl ? (
                  <AnimatedPressable
                    onPress={handlePayNow}
                    style={{
                      backgroundColor: '#1B2B4B',
                      borderRadius: 16,
                      paddingVertical: 18,
                      alignItems: 'center',
                      width: '100%',
                    }}
                  >
                    <Text style={{ color: '#FFFFFF', fontSize: 17, fontWeight: '700', fontFamily: 'DMSans_700Bold' }}>
                      Pay now
                    </Text>
                  </AnimatedPressable>
                ) : null}

                <AnimatedPressable
                  onPress={handleViewBooking}
                  style={{
                    backgroundColor: COLORS.surfaceSecondary,
                    borderRadius: 16,
                    paddingVertical: 16,
                    alignItems: 'center',
                    width: '100%',
                  }}
                >
                  <Text style={{ color: COLORS.text, fontSize: 16, fontWeight: '600', fontFamily: 'DMSans_600SemiBold' }}>
                    View booking
                  </Text>
                </AnimatedPressable>
              </View>
            )}
          </ScrollView>
        </Animated.View>

        {/* Bottom CTA */}
        {step === 1 && (
          <View
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              padding: 20,
              paddingBottom: insets.bottom + 16,
              backgroundColor: COLORS.background,
              borderTopWidth: 1,
              borderTopColor: COLORS.border,
            }}
          >
            <AnimatedPressable
              onPress={goNext}
              disabled={!canProceedStep1}
              style={{
                backgroundColor: canProceedStep1 ? '#1B2B4B' : COLORS.surfaceSecondary,
                borderRadius: 16,
                paddingVertical: 18,
                alignItems: 'center',
                flexDirection: 'row',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              <Text style={{ color: canProceedStep1 ? '#FFFFFF' : COLORS.textTertiary, fontSize: 17, fontWeight: '700', fontFamily: 'DMSans_700Bold' }}>
                {selectedTime ? `Continue with ${formatTime12(selectedTime)}` : 'Select a time to continue'}
              </Text>
              {canProceedStep1 && <ChevronRight size={20} color="#FFFFFF" />}
            </AnimatedPressable>
          </View>
        )}

        {step === 2 && (
          <View
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              padding: 20,
              paddingBottom: insets.bottom + 16,
              backgroundColor: COLORS.background,
              borderTopWidth: 1,
              borderTopColor: COLORS.border,
            }}
          >
            <AnimatedPressable
              onPress={goNext}
              disabled={!canProceedStep2}
              style={{
                backgroundColor: '#1B2B4B',
                borderRadius: 16,
                paddingVertical: 18,
                alignItems: 'center',
                flexDirection: 'row',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              <Text style={{ color: '#FFFFFF', fontSize: 17, fontWeight: '700', fontFamily: 'DMSans_700Bold' }}>
                Review booking
              </Text>
              <ChevronRight size={20} color="#FFFFFF" />
            </AnimatedPressable>
          </View>
        )}

        {step === 3 && (
          <View
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              padding: 20,
              paddingBottom: insets.bottom + 16,
              backgroundColor: COLORS.background,
              borderTopWidth: 1,
              borderTopColor: COLORS.border,
            }}
          >
            <AnimatedPressable
              onPress={handleConfirm}
              disabled={submitting || !user}
              style={{
                backgroundColor: user ? '#1B2B4B' : COLORS.surfaceSecondary,
                borderRadius: 16,
                paddingVertical: 18,
                alignItems: 'center',
              }}
            >
              {submitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={{ color: user ? '#FFFFFF' : COLORS.textTertiary, fontSize: 17, fontWeight: '700', fontFamily: 'DMSans_700Bold' }}>
                  {user ? 'Confirm booking' : 'Sign in to book'}
                </Text>
              )}
            </AnimatedPressable>
          </View>
        )}
      </View>
    </>
  );
}
