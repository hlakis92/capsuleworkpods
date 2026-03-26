import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import { Image } from 'expo-image';
import * as Linking from 'expo-linking';
import { useColors } from '@/hooks/useColors';
import { capsuleGet, capsulePost } from '@/utils/capsuleApi';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { SkeletonLine } from '@/components/SkeletonLoader';
import { StatusBadge } from '@/components/StatusBadge';
import { MapPin, Calendar, Clock, CreditCard, CheckCircle, XCircle, AlertCircle } from 'lucide-react-native';

interface BookingDetail {
  id: string;
  pod_id: string;
  start_time: string;
  end_time: string;
  status: string;
  price_base: number;
  discount_percent: number;
  price_final: number;
  payment_status: string;
  qr_token: string;
  pod: {
    id: string;
    name: string;
    type: string;
    image_url: string;
    location: {
      name: string;
      address: string;
    };
  };
}

function resolveImageSource(source: string | undefined) {
  if (!source) return { uri: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800' };
  return { uri: source };
}

function formatBookingDate(isoStr: string): string {
  if (!isoStr) return '';
  try {
    return new Date(isoStr).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return isoStr;
  }
}

function formatBookingTime(startIso: string, endIso: string): string {
  if (!startIso || !endIso) return '';
  try {
    const start = new Date(startIso);
    const end = new Date(endIso);
    const fmt = (d: Date) =>
      d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
    return `${fmt(start)} – ${fmt(end)}`;
  } catch {
    return '';
  }
}

function getDurationHours(startIso: string, endIso: string): number {
  try {
    const diff = new Date(endIso).getTime() - new Date(startIso).getTime();
    return Math.round((diff / (1000 * 60 * 60)) * 10) / 10;
  } catch {
    return 0;
  }
}

export default function BookingDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string; payment?: string }>();
  const params = useLocalSearchParams<{ payment?: string }>();
  const COLORS = useColors();

  const [booking, setBooking] = useState<BookingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [payLoading, setPayLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchBooking = useCallback(async () => {
    if (!id) return;
    console.log('[BookingDetail] Fetching booking:', id);
    try {
      const data = await capsuleGet<BookingDetail>(`/api/bookings/${id}`);
      setBooking(data);
      setError('');
    } catch (e: unknown) {
      console.error('[BookingDetail] Failed to fetch:', e);
      setError('Could not load booking details.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [id]);

  useEffect(() => {
    fetchBooking();
  }, [fetchBooking]);

  // Handle payment return
  useEffect(() => {
    if (params.payment === 'success') {
      console.log('[BookingDetail] Payment success return, refreshing booking');
      fetchBooking();
    } else if (params.payment === 'cancelled') {
      console.log('[BookingDetail] Payment cancelled return');
    }
  }, [params.payment, fetchBooking]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchBooking();
  }, [fetchBooking]);

  const handlePayNow = async () => {
    if (!booking?.id) return;
    console.log('[BookingDetail] Pay Now pressed for booking:', booking.id);
    setPayLoading(true);
    try {
      const data = await capsulePost<{ checkout_url: string }>('/api/checkout', {
        booking_id: booking.id,
      });
      if (data.checkout_url) {
        console.log('[BookingDetail] Opening checkout URL');
        await Linking.openURL(data.checkout_url);
      }
    } catch (e: unknown) {
      console.error('[BookingDetail] Checkout failed:', e);
    } finally {
      setPayLoading(false);
    }
  };

  const dateStr = booking ? formatBookingDate(booking.start_time) : '';
  const timeStr = booking ? formatBookingTime(booking.start_time, booking.end_time) : '';
  const durationHours = booking ? getDurationHours(booking.start_time, booking.end_time) : 0;
  const durationStr = `${durationHours} ${durationHours === 1 ? 'hour' : 'hours'}`;

  const basePriceStr = booking ? `$${Number(booking.price_base).toFixed(2)}` : '';
  const discountPct = booking?.discount_percent ?? 0;
  const discountAmt = booking ? Number(booking.price_base) * (discountPct / 100) : 0;
  const discountStr = discountPct > 0 ? `-$${discountAmt.toFixed(2)}` : null;
  const finalPriceStr = booking ? `$${Number(booking.price_final).toFixed(2)}` : '';

  const accessCode = booking?.qr_token ? String(booking.qr_token).split('-')[0].toUpperCase() : '';
  const showQR = booking?.status === 'confirmed' && booking?.qr_token;
  const showPayButton = booking?.payment_status === 'unpaid' && booking?.status !== 'cancelled';

  const podName = booking?.pod?.name ?? 'Booking Details';

  const statusBannerBg = booking?.status === 'confirmed'
    ? COLORS.accentMuted
    : booking?.status === 'pending'
    ? COLORS.warningMuted
    : booking?.status === 'cancelled'
    ? COLORS.dangerMuted
    : COLORS.surfaceSecondary;

  const StatusIcon = booking?.status === 'confirmed'
    ? CheckCircle
    : booking?.status === 'cancelled'
    ? XCircle
    : AlertCircle;

  const statusIconColor = booking?.status === 'confirmed'
    ? COLORS.accent
    : booking?.status === 'cancelled'
    ? COLORS.danger
    : COLORS.warning;

  const statusLabel = booking?.status === 'confirmed'
    ? 'Booking Confirmed'
    : booking?.status === 'pending'
    ? 'Awaiting Payment'
    : booking?.status === 'cancelled'
    ? 'Booking Cancelled'
    : String(booking?.status ?? '');

  return (
    <>
      <Stack.Screen options={{ title: 'Booking Details' }} />
      <ScrollView
        style={{ flex: 1, backgroundColor: COLORS.background }}
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="automatic"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
        }
      >
        {loading ? (
          <View style={{ padding: 20, gap: 16 }}>
            <SkeletonLine width="100%" height={200} borderRadius={16} />
            <SkeletonLine width="70%" height={22} />
            <SkeletonLine width="50%" height={16} />
            <SkeletonLine width="60%" height={14} />
          </View>
        ) : error ? (
          <View
            style={{
              flex: 1,
              alignItems: 'center',
              justifyContent: 'center',
              padding: 32,
              gap: 12,
              marginTop: 60,
            }}
          >
            <Text style={{ fontSize: 17, fontWeight: '600', color: COLORS.text, fontFamily: 'DMSans_600SemiBold' }}>
              Couldn't load booking
            </Text>
            <Text style={{ fontSize: 14, color: COLORS.textSecondary, fontFamily: 'DMSans_400Regular', textAlign: 'center' }}>
              {error}
            </Text>
            <AnimatedPressable
              onPress={() => {
                console.log('[BookingDetail] Retry pressed');
                setLoading(true);
                fetchBooking();
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
          <View>
            {/* Status banner */}
            <View
              style={{
                backgroundColor: statusBannerBg,
                padding: 16,
                paddingHorizontal: 20,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <StatusIcon size={20} color={statusIconColor} />
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 15, fontWeight: '700', color: COLORS.text, fontFamily: 'DMSans_700Bold' }}>
                  {statusLabel}
                </Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 }}>
                  <StatusBadge status={booking?.status ?? 'pending'} type="booking" />
                  <StatusBadge status={booking?.payment_status ?? 'unpaid'} type="payment" />
                </View>
              </View>
            </View>

            {/* Pod image */}
            <View style={{ height: 220 }}>
              <Image
                source={resolveImageSource(booking?.pod?.image_url)}
                style={{ width: '100%', height: '100%' }}
                contentFit="cover"
              />
            </View>

            <View style={{ padding: 20, gap: 20 }}>
              {/* Pod name & location */}
              <View style={{ gap: 6 }}>
                <Text
                  style={{
                    fontSize: 22,
                    fontWeight: '800',
                    color: COLORS.text,
                    fontFamily: 'DMSans_700Bold',
                    letterSpacing: -0.5,
                  }}
                >
                  {podName}
                </Text>
                {booking?.pod?.location && (
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <MapPin size={14} color={COLORS.textTertiary} />
                    <Text style={{ fontSize: 14, color: COLORS.textSecondary, fontFamily: 'DMSans_400Regular' }}>
                      {booking.pod.location.name}
                    </Text>
                  </View>
                )}
              </View>

              {/* Date, time, duration */}
              <View
                style={{
                  backgroundColor: COLORS.surface,
                  borderRadius: 16,
                  padding: 16,
                  borderWidth: 1,
                  borderColor: COLORS.border,
                  gap: 12,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
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
                    <Calendar size={18} color={COLORS.primary} />
                  </View>
                  <Text style={{ fontSize: 14, color: COLORS.text, fontFamily: 'DMSans_500Medium', flex: 1 }}>
                    {dateStr}
                  </Text>
                </View>
                <View style={{ height: 1, backgroundColor: COLORS.divider }} />
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
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
                    <Clock size={18} color={COLORS.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 14, color: COLORS.text, fontFamily: 'DMSans_500Medium' }}>
                      {timeStr}
                    </Text>
                    <Text style={{ fontSize: 12, color: COLORS.textSecondary, fontFamily: 'DMSans_400Regular' }}>
                      {durationStr}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Price breakdown */}
              <View
                style={{
                  backgroundColor: COLORS.surface,
                  borderRadius: 16,
                  padding: 16,
                  borderWidth: 1,
                  borderColor: COLORS.border,
                  gap: 10,
                }}
              >
                <Text
                  style={{
                    fontSize: 15,
                    fontWeight: '700',
                    color: COLORS.text,
                    fontFamily: 'DMSans_700Bold',
                    marginBottom: 2,
                  }}
                >
                  Price breakdown
                </Text>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 14, color: COLORS.textSecondary, fontFamily: 'DMSans_400Regular' }}>
                    Base price
                  </Text>
                  <Text style={{ fontSize: 14, color: COLORS.text, fontFamily: 'DMSans_500Medium' }}>
                    {basePriceStr}
                  </Text>
                </View>
                {discountStr && (
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ fontSize: 14, color: COLORS.accent, fontFamily: 'DMSans_500Medium' }}>
                      Membership discount (
                      {discountPct}
                      %)
                    </Text>
                    <Text style={{ fontSize: 14, color: COLORS.accent, fontFamily: 'DMSans_600SemiBold' }}>
                      {discountStr}
                    </Text>
                  </View>
                )}
                <View style={{ height: 1, backgroundColor: COLORS.divider }} />
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <Text style={{ fontSize: 16, fontWeight: '700', color: COLORS.text, fontFamily: 'DMSans_700Bold' }}>
                    Total
                  </Text>
                  <Text style={{ fontSize: 18, fontWeight: '800', color: COLORS.primary, fontFamily: 'DMSans_700Bold' }}>
                    {finalPriceStr}
                  </Text>
                </View>
              </View>

              {/* QR Code / Access Code */}
              {showQR && (
                <View
                  style={{
                    backgroundColor: COLORS.surface,
                    borderRadius: 16,
                    padding: 20,
                    borderWidth: 1,
                    borderColor: COLORS.border,
                    alignItems: 'center',
                    gap: 16,
                  }}
                >
                  <Text style={{ fontSize: 15, fontWeight: '700', color: COLORS.text, fontFamily: 'DMSans_700Bold' }}>
                    Entry Access Code
                  </Text>
                  <View
                    style={{
                      backgroundColor: '#1B2B4B',
                      borderRadius: 16,
                      padding: 24,
                      alignItems: 'center',
                      width: '100%',
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 32,
                        fontWeight: '800',
                        color: '#FFFFFF',
                        fontFamily: 'DMSans_700Bold',
                        letterSpacing: 6,
                        textAlign: 'center',
                      }}
                      selectable
                    >
                      {accessCode}
                    </Text>
                  </View>
                  <Text style={{ fontSize: 12, color: COLORS.textTertiary, fontFamily: 'DMSans_400Regular', textAlign: 'center' }}>
                    Show this code at the pod entrance
                  </Text>
                  <Text
                    style={{
                      fontSize: 11,
                      color: COLORS.textTertiary,
                      fontFamily: 'DMSans_400Regular',
                      textAlign: 'center',
                    }}
                    selectable
                  >
                    Token: {String(booking?.qr_token ?? '')}
                  </Text>
                </View>
              )}

              {/* Booking ID */}
              <View style={{ alignItems: 'center' }}>
                <Text style={{ fontSize: 12, color: COLORS.textTertiary, fontFamily: 'DMSans_400Regular' }} selectable>
                  Booking ID: {String(booking?.id ?? '').slice(0, 8).toUpperCase()}
                </Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Pay Now button */}
      {!loading && showPayButton && (
        <View
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            right: 0,
            padding: 20,
            paddingBottom: 32,
            backgroundColor: COLORS.background,
            borderTopWidth: 1,
            borderTopColor: COLORS.border,
          }}
        >
          <AnimatedPressable
            onPress={handlePayNow}
            disabled={payLoading}
            style={{
              backgroundColor: '#1B2B4B',
              borderRadius: 16,
              paddingVertical: 18,
              alignItems: 'center',
              flexDirection: 'row',
              justifyContent: 'center',
              gap: 10,
            }}
          >
            {payLoading ? (
              <ActivityIndicator color="#FFFFFF" />
            ) : (
              <>
                <CreditCard size={20} color="#FFFFFF" />
                <Text style={{ color: '#FFFFFF', fontSize: 17, fontWeight: '700', fontFamily: 'DMSans_700Bold' }}>
                  Complete payment
                </Text>
              </>
            )}
          </AnimatedPressable>
        </View>
      )}
    </>
  );
}
