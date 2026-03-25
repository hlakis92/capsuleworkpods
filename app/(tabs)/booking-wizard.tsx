import { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  Animated,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Linking from 'expo-linking';
import { useColors } from '@/hooks/useColors';
import { apiGet, apiPost } from '@/utils/api';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { Check, ChevronLeft, ChevronRight, Calendar, Clock, X } from 'lucide-react-native';

interface AvailabilitySlot {
  start_time: string;
  end_time: string;
}

interface BookingResult {
  id: string;
  status: string;
  price_base: number;
  discount_percent: number;
  price_final: number;
  payment_status: string;
}

const DURATIONS = [
  { label: '1h', hours: 1 },
  { label: '2h', hours: 2 },
  { label: '3h', hours: 3 },
  { label: '4h', hours: 4 },
];

const TIME_SLOTS = [
  '08:00', '09:00', '10:00', '11:00', '12:00',
  '13:00', '14:00', '15:00', '16:00', '17:00',
  '18:00', '19:00', '20:00',
];

function resolveImageSource(source: string | undefined) {
  if (!source) return { uri: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800' };
  return { uri: source };
}

function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
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
  return `${iso}T${timeStr}:00.000Z`;
}

function addHoursToTime(timeStr: string, hours: number): string {
  const [h, m] = timeStr.split(':').map(Number);
  const totalMins = h * 60 + m + hours * 60;
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

export default function BookingWizardScreen() {
  const { podId, podName, pricePerHour } = useLocalSearchParams<{
    podId: string;
    podName: string;
    pricePerHour: string;
  }>();
  const COLORS = useColors();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [step, setStep] = useState(1);
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [selectedDuration, setSelectedDuration] = useState<number>(1);
  const [bookedSlots, setBookedSlots] = useState<AvailabilitySlot[]>([]);
  const [loadingAvailability, setLoadingAvailability] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [bookingResult, setBookingResult] = useState<BookingResult | null>(null);
  const [checkoutUrl, setCheckoutUrl] = useState('');
  const [error, setError] = useState('');

  const slideAnim = useRef(new Animated.Value(0)).current;

  const priceNum = Number(pricePerHour) || 0;

  const fetchAvailability = useCallback(async (date: Date) => {
    if (!podId) return;
    const dateStr = formatDateISO(date);
    console.log('[BookingWizard] Fetching availability for pod:', podId, 'date:', dateStr);
    setLoadingAvailability(true);
    try {
      const data = await apiGet<{ booked_slots: AvailabilitySlot[] }>(
        `/api/pods/${podId}/availability?date=${dateStr}`
      );
      setBookedSlots(data.booked_slots || []);
    } catch (e: unknown) {
      console.error('[BookingWizard] Failed to fetch availability:', e);
      setBookedSlots([]);
    } finally {
      setLoadingAvailability(false);
    }
  }, [podId]);

  useEffect(() => {
    fetchAvailability(selectedDate);
  }, [selectedDate, fetchAvailability]);

  const animateStep = () => {
    slideAnim.setValue(30);
    Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, speed: 20, bounciness: 4 }).start();
  };

  const goNext = () => {
    console.log('[BookingWizard] Next step from:', step);
    animateStep();
    setStep((s) => s + 1);
  };

  const goBack = () => {
    if (step === 1) {
      router.back();
      return;
    }
    console.log('[BookingWizard] Back step from:', step);
    animateStep();
    setStep((s) => s - 1);
  };

  const handleConfirm = async () => {
    if (!podId || !selectedTime || !selectedDate) return;
    const startISO = buildDateTimeISO(selectedDate, selectedTime);
    const endTime = addHoursToTime(selectedTime, selectedDuration);
    const endISO = buildDateTimeISO(selectedDate, endTime);

    console.log('[BookingWizard] Creating booking:', { podId, startISO, endISO });
    setSubmitting(true);
    setError('');
    try {
      const booking = await apiPost<BookingResult>('/api/bookings', {
        pod_id: podId,
        start_time: startISO,
        end_time: endISO,
      });
      console.log('[BookingWizard] Booking created:', booking.id);
      setBookingResult(booking);

      // Fetch checkout URL
      console.log('[BookingWizard] Fetching checkout URL for booking:', booking.id);
      const checkout = await apiPost<{ checkout_url: string }>('/api/checkout', {
        booking_id: booking.id,
      });
      setCheckoutUrl(checkout.checkout_url || '');
      setStep(4);
    } catch (e: unknown) {
      const err = e as { message?: string };
      console.error('[BookingWizard] Booking failed:', e);
      setError(err?.message || 'Failed to create booking. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handlePayNow = async () => {
    if (!checkoutUrl) return;
    console.log('[BookingWizard] Opening checkout URL:', checkoutUrl);
    await Linking.openURL(checkoutUrl);
  };

  const handleViewBooking = () => {
    if (!bookingResult?.id) return;
    console.log('[BookingWizard] View booking pressed:', bookingResult.id);
    router.replace(`/(tabs)/booking/${bookingResult.id}`);
  };

  // Generate calendar days (next 14 days)
  const calendarDays = Array.from({ length: 14 }, (_, i) => addDays(new Date(), i));

  const basePrice = priceNum * selectedDuration;
  const discountPct = bookingResult?.discount_percent ?? 0;
  const discountAmt = basePrice * (discountPct / 100);
  const finalPrice = bookingResult?.price_final ?? (basePrice - discountAmt);

  const basePriceDisplay = `$${basePrice.toFixed(2)}`;
  const discountDisplay = discountPct > 0 ? `-$${discountAmt.toFixed(2)}` : null;
  const finalPriceDisplay = `$${Number(finalPrice).toFixed(2)}`;

  const endTimeDisplay = selectedTime ? addHoursToTime(selectedTime, selectedDuration) : '';
  const dateDisplay = formatDate(selectedDate);

  const canProceedStep1 = selectedTime !== null;
  const canProceedStep2 = selectedDuration > 0;

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Book Pod',
          presentation: 'formSheet',
          sheetGrabberVisible: true,
          sheetAllowedDetents: [0.92],
          headerShown: true,
          headerStyle: { backgroundColor: COLORS.surface },
          headerTintColor: COLORS.text,
          headerTitleStyle: { fontFamily: 'DMSans_600SemiBold', fontSize: 17 },
          headerLeft: () => (
            <AnimatedPressable onPress={goBack} style={{ padding: 4 }}>
              {step === 1 ? (
                <X size={22} color={COLORS.text} />
              ) : (
                <ChevronLeft size={22} color={COLORS.text} />
              )}
            </AnimatedPressable>
          ),
        }}
      />

      <View style={{ flex: 1, backgroundColor: COLORS.surface }}>
        {/* Step indicator */}
        <View
          style={{
            flexDirection: 'row',
            paddingHorizontal: 20,
            paddingTop: 16,
            paddingBottom: 8,
            gap: 6,
          }}
        >
          {[1, 2, 3].map((s) => (
            <View
              key={s}
              style={{
                flex: 1,
                height: 3,
                borderRadius: 2,
                backgroundColor: s <= step ? COLORS.primary : COLORS.surfaceSecondary,
              }}
            />
          ))}
        </View>

        <Animated.View
          style={{
            flex: 1,
            transform: [{ translateY: slideAnim }],
          }}
        >
          <ScrollView
            contentContainerStyle={{ padding: 20, paddingBottom: 120, gap: 20 }}
            showsVerticalScrollIndicator={false}
          >
            {/* STEP 1: Date & Time */}
            {step === 1 && (
              <View style={{ gap: 20 }}>
                <View style={{ gap: 4 }}>
                  <Text style={{ fontSize: 22, fontWeight: '800', color: COLORS.text, fontFamily: 'DMSans_700Bold', letterSpacing: -0.5 }}>
                    Choose date & time
                  </Text>
                  <Text style={{ fontSize: 14, color: COLORS.textSecondary, fontFamily: 'DMSans_400Regular' }}>
                    {String(podName)}
                  </Text>
                </View>

                {/* Date picker */}
                <View style={{ gap: 10 }}>
                  <Text style={{ fontSize: 15, fontWeight: '600', color: COLORS.text, fontFamily: 'DMSans_600SemiBold' }}>
                    Select date
                  </Text>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -20 }} contentContainerStyle={{ paddingHorizontal: 20, gap: 8 }}>
                    {calendarDays.map((day, i) => {
                      const isSelected = formatDateISO(day) === formatDateISO(selectedDate);
                      const dayName = day.toLocaleDateString('en-US', { weekday: 'short' });
                      const dayNum = day.getDate();
                      return (
                        <AnimatedPressable
                          key={i}
                          onPress={() => {
                            console.log('[BookingWizard] Date selected:', formatDateISO(day));
                            setSelectedDate(day);
                            setSelectedTime(null);
                          }}
                          style={{
                            width: 56,
                            paddingVertical: 12,
                            borderRadius: 14,
                            alignItems: 'center',
                            gap: 4,
                            backgroundColor: isSelected ? COLORS.primary : COLORS.surfaceSecondary,
                          }}
                        >
                          <Text style={{ fontSize: 11, fontWeight: '600', color: isSelected ? 'rgba(255,255,255,0.8)' : COLORS.textSecondary, fontFamily: 'DMSans_600SemiBold' }}>
                            {dayName}
                          </Text>
                          <Text style={{ fontSize: 18, fontWeight: '700', color: isSelected ? '#FFFFFF' : COLORS.text, fontFamily: 'DMSans_700Bold' }}>
                            {dayNum}
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
                    </View>
                  ) : (
                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                      {TIME_SLOTS.map((time) => {
                        const booked = isSlotBooked(time, bookedSlots);
                        const isSelected = selectedTime === time;
                        return (
                          <AnimatedPressable
                            key={time}
                            onPress={() => {
                              if (booked) return;
                              console.log('[BookingWizard] Time selected:', time);
                              setSelectedTime(time);
                            }}
                            disabled={booked}
                            style={{
                              paddingHorizontal: 16,
                              paddingVertical: 10,
                              borderRadius: 12,
                              backgroundColor: booked
                                ? COLORS.surfaceSecondary
                                : isSelected
                                ? COLORS.primary
                                : COLORS.surface,
                              borderWidth: 1,
                              borderColor: booked
                                ? COLORS.border
                                : isSelected
                                ? COLORS.primary
                                : COLORS.border,
                              opacity: booked ? 0.5 : 1,
                            }}
                          >
                            <Text
                              style={{
                                fontSize: 14,
                                fontWeight: '600',
                                color: booked
                                  ? COLORS.textTertiary
                                  : isSelected
                                  ? '#FFFFFF'
                                  : COLORS.text,
                                fontFamily: 'DMSans_600SemiBold',
                              }}
                            >
                              {time}
                            </Text>
                          </AnimatedPressable>
                        );
                      })}
                    </View>
                  )}
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
                    {selectedTime}
                  </Text>
                </View>

                <View style={{ flexDirection: 'row', gap: 12, flexWrap: 'wrap' }}>
                  {DURATIONS.map((d) => {
                    const isSelected = selectedDuration === d.hours;
                    const price = priceNum * d.hours;
                    const priceStr = `$${price.toFixed(0)}`;
                    return (
                      <AnimatedPressable
                        key={d.hours}
                        onPress={() => {
                          console.log('[BookingWizard] Duration selected:', d.hours, 'hours');
                          setSelectedDuration(d.hours);
                        }}
                        style={{
                          flex: 1,
                          minWidth: '45%',
                          paddingVertical: 20,
                          borderRadius: 16,
                          alignItems: 'center',
                          gap: 6,
                          backgroundColor: isSelected ? COLORS.primary : COLORS.surface,
                          borderWidth: 1.5,
                          borderColor: isSelected ? COLORS.primary : COLORS.border,
                        }}
                      >
                        <Text
                          style={{
                            fontSize: 24,
                            fontWeight: '800',
                            color: isSelected ? '#FFFFFF' : COLORS.text,
                            fontFamily: 'DMSans_700Bold',
                          }}
                        >
                          {d.label}
                        </Text>
                        <Text
                          style={{
                            fontSize: 14,
                            color: isSelected ? 'rgba(255,255,255,0.8)' : COLORS.textSecondary,
                            fontFamily: 'DMSans_500Medium',
                          }}
                        >
                          {priceStr}
                        </Text>
                      </AnimatedPressable>
                    );
                  })}
                </View>

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
                    {selectedTime}
                    {' – '}
                    {endTimeDisplay}
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
                  <View style={{ height: 140 }}>
                    <Image
                      source={resolveImageSource(undefined)}
                      style={{ width: '100%', height: '100%' }}
                      contentFit="cover"
                    />
                  </View>
                  <View style={{ padding: 16, gap: 12 }}>
                    <Text style={{ fontSize: 18, fontWeight: '700', color: COLORS.text, fontFamily: 'DMSans_700Bold' }}>
                      {String(podName)}
                    </Text>

                    <View style={{ gap: 8 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        <Calendar size={16} color={COLORS.textSecondary} />
                        <Text style={{ fontSize: 14, color: COLORS.text, fontFamily: 'DMSans_500Medium' }}>
                          {dateDisplay}
                        </Text>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                        <Clock size={16} color={COLORS.textSecondary} />
                        <Text style={{ fontSize: 14, color: COLORS.text, fontFamily: 'DMSans_500Medium' }}>
                          {selectedTime}
                          {' – '}
                          {endTimeDisplay}
                          {' ('}
                          {selectedDuration}
                          {selectedDuration === 1 ? ' hour)' : ' hours)'}
                        </Text>
                      </View>
                    </View>

                    <View style={{ height: 1, backgroundColor: COLORS.divider }} />

                    {/* Price breakdown */}
                    <View style={{ gap: 8 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Text style={{ fontSize: 14, color: COLORS.textSecondary, fontFamily: 'DMSans_400Regular' }}>
                          {selectedDuration}
                          {selectedDuration === 1 ? ' hour' : ' hours'}
                          {' × $'}
                          {priceNum.toFixed(0)}
                        </Text>
                        <Text style={{ fontSize: 14, color: COLORS.text, fontFamily: 'DMSans_500Medium' }}>
                          {basePriceDisplay}
                        </Text>
                      </View>
                      {discountDisplay && (
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                          <Text style={{ fontSize: 14, color: COLORS.accent, fontFamily: 'DMSans_500Medium' }}>
                            Membership discount
                          </Text>
                          <Text style={{ fontSize: 14, color: COLORS.accent, fontFamily: 'DMSans_600SemiBold' }}>
                            {discountDisplay}
                          </Text>
                        </View>
                      )}
                      <View style={{ height: 1, backgroundColor: COLORS.divider }} />
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Text style={{ fontSize: 16, fontWeight: '700', color: COLORS.text, fontFamily: 'DMSans_700Bold' }}>
                          Total
                        </Text>
                        <Text style={{ fontSize: 18, fontWeight: '800', color: COLORS.primary, fontFamily: 'DMSans_700Bold' }}>
                          {finalPriceDisplay}
                        </Text>
                      </View>
                    </View>
                  </View>
                </View>

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
                        {finalPriceDisplay}
                      </Text>
                    </View>
                  </View>
                )}

                {checkoutUrl ? (
                  <AnimatedPressable
                    onPress={handlePayNow}
                    style={{
                      backgroundColor: COLORS.primary,
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
        {step < 3 && (
          <View
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              padding: 20,
              paddingBottom: insets.bottom + 16,
              backgroundColor: COLORS.surface,
              borderTopWidth: 1,
              borderTopColor: COLORS.border,
            }}
          >
            <AnimatedPressable
              onPress={goNext}
              disabled={step === 1 ? !canProceedStep1 : !canProceedStep2}
              style={{
                backgroundColor: COLORS.primary,
                borderRadius: 16,
                paddingVertical: 18,
                alignItems: 'center',
                flexDirection: 'row',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              <Text style={{ color: '#FFFFFF', fontSize: 17, fontWeight: '700', fontFamily: 'DMSans_700Bold' }}>
                Continue
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
              backgroundColor: COLORS.surface,
              borderTopWidth: 1,
              borderTopColor: COLORS.border,
            }}
          >
            <AnimatedPressable
              onPress={handleConfirm}
              disabled={submitting}
              style={{
                backgroundColor: COLORS.primary,
                borderRadius: 16,
                paddingVertical: 18,
                alignItems: 'center',
              }}
            >
              {submitting ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={{ color: '#FFFFFF', fontSize: 17, fontWeight: '700', fontFamily: 'DMSans_700Bold' }}>
                  Confirm booking
                </Text>
              )}
            </AnimatedPressable>
          </View>
        )}
      </View>
    </>
  );
}
