import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  SectionList,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/contexts/AuthContext';
import { apiGet } from '@/utils/api';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { AnimatedListItem } from '@/components/AnimatedListItem';
import { SkeletonBookingCard } from '@/components/SkeletonLoader';
import { StatusBadge } from '@/components/StatusBadge';
import { AuthGuard } from '@/components/AuthGuard';
import { CalendarDays, ChevronRight, MapPin } from 'lucide-react-native';

interface Booking {
  id: string;
  pod_id: string;
  start_time: string;
  end_time: string;
  status: string;
  price_final: number;
  payment_status: string;
  pod: {
    name: string;
    image_url: string;
    location: { name: string };
  };
}

function resolveImageSource(source: string | undefined) {
  if (!source) return { uri: 'https://images.unsplash.com/photo-1497366216548-37526070297c?w=800' };
  return { uri: source };
}

function formatBookingDate(isoStr: string): string {
  if (!isoStr) return '';
  try {
    const d = new Date(isoStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
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

function isUpcoming(booking: Booking): boolean {
  try {
    return new Date(booking.start_time) >= new Date();
  } catch {
    return false;
  }
}

export default function BookingsScreen() {
  const COLORS = useColors();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const fetchBookings = useCallback(async () => {
    if (!user) return;
    console.log('[Bookings] Fetching bookings');
    try {
      const data = await apiGet<{ bookings: Booking[] }>('/api/bookings');
      setBookings(data.bookings || []);
      setError('');
    } catch (e: unknown) {
      console.error('[Bookings] Failed to fetch:', e);
      setError('Could not load bookings.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) fetchBookings();
    else setLoading(false);
  }, [user, fetchBookings]);

  const onRefresh = useCallback(() => {
    console.log('[Bookings] Pull to refresh');
    setRefreshing(true);
    fetchBookings();
  }, [fetchBookings]);

  const upcoming = bookings.filter(isUpcoming);
  const past = bookings.filter((b) => !isUpcoming(b));

  const sections = [
    ...(upcoming.length > 0 ? [{ title: 'Upcoming', data: upcoming }] : []),
    ...(past.length > 0 ? [{ title: 'Past', data: past }] : []),
  ];

  const renderBookingCard = ({ item, index }: { item: Booking; index: number }) => {
    const dateStr = formatBookingDate(item.start_time);
    const timeStr = formatBookingTime(item.start_time, item.end_time);
    const priceStr = `$${Number(item.price_final).toFixed(2)}`;
    const locationName = item.pod?.location?.name ?? '';
    const podName = item.pod?.name ?? 'Pod';

    return (
      <AnimatedListItem index={index}>
        <AnimatedPressable
          onPress={() => {
            console.log('[Bookings] Booking card pressed:', item.id);
            router.push(`/(tabs)/booking/${item.id}`);
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
            source={resolveImageSource(item.pod?.image_url)}
            style={{ width: 88, height: 88 }}
            contentFit="cover"
          />
          <View style={{ flex: 1, padding: 12, gap: 4, justifyContent: 'center' }}>
            <Text
              style={{
                fontSize: 15,
                fontWeight: '700',
                color: COLORS.text,
                fontFamily: 'DMSans_700Bold',
              }}
              numberOfLines={1}
            >
              {podName}
            </Text>
            {locationName ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <MapPin size={11} color={COLORS.textTertiary} />
                <Text
                  style={{ fontSize: 12, color: COLORS.textSecondary, fontFamily: 'DMSans_400Regular' }}
                  numberOfLines={1}
                >
                  {locationName}
                </Text>
              </View>
            ) : null}
            <Text style={{ fontSize: 12, color: COLORS.textSecondary, fontFamily: 'DMSans_400Regular' }}>
              {dateStr}
            </Text>
            <Text style={{ fontSize: 12, color: COLORS.textSecondary, fontFamily: 'DMSans_400Regular' }}>
              {timeStr}
            </Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 }}>
              <StatusBadge status={item.status} type="booking" />
              <Text style={{ fontSize: 13, fontWeight: '700', color: COLORS.primary, fontFamily: 'DMSans_700Bold' }}>
                {priceStr}
              </Text>
            </View>
          </View>
          <View style={{ justifyContent: 'center', paddingRight: 12 }}>
            <ChevronRight size={18} color={COLORS.textTertiary} />
          </View>
        </AnimatedPressable>
      </AnimatedListItem>
    );
  };

  return (
    <AuthGuard user={user} loading={authLoading}>
      {loading ? (
        <View style={{ flex: 1, backgroundColor: COLORS.background, padding: 16, gap: 12 }}>
          {[0, 1, 2, 3].map((i) => <SkeletonBookingCard key={i} />)}
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
            Couldn't load bookings
          </Text>
          <Text style={{ fontSize: 14, color: COLORS.textSecondary, fontFamily: 'DMSans_400Regular', textAlign: 'center' }}>
            {error}
          </Text>
          <AnimatedPressable
            onPress={() => {
              console.log('[Bookings] Retry pressed');
              setLoading(true);
              fetchBookings();
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
        <SectionList
          sections={sections}
          keyExtractor={(item) => item.id}
          renderItem={renderBookingCard}
          renderSectionHeader={({ section }) => (
            <View
              style={{
                paddingHorizontal: 16,
                paddingTop: 20,
                paddingBottom: 10,
                backgroundColor: COLORS.background,
              }}
            >
              <Text
                style={{
                  fontSize: 17,
                  fontWeight: '700',
                  color: COLORS.text,
                  fontFamily: 'DMSans_700Bold',
                }}
              >
                {section.title}
              </Text>
            </View>
          )}
          contentContainerStyle={{ padding: 16, paddingBottom: 120, gap: 10 }}
          style={{ backgroundColor: COLORS.background }}
          contentInsetAdjustmentBehavior="automatic"
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
          }
          ListEmptyComponent={
            <View
              style={{
                alignItems: 'center',
                paddingTop: 80,
                gap: 16,
                paddingHorizontal: 32,
              }}
            >
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
                <CalendarDays size={32} color={COLORS.primary} />
              </View>
              <Text
                style={{
                  fontSize: 20,
                  fontWeight: '700',
                  color: COLORS.text,
                  fontFamily: 'DMSans_700Bold',
                  textAlign: 'center',
                }}
              >
                No bookings yet
              </Text>
              <Text
                style={{
                  fontSize: 15,
                  color: COLORS.textSecondary,
                  fontFamily: 'DMSans_400Regular',
                  textAlign: 'center',
                  lineHeight: 22,
                }}
              >
                Your upcoming and past pod bookings will appear here.
              </Text>
              <AnimatedPressable
                onPress={() => {
                  console.log('[Bookings] Explore pods pressed from empty state');
                  router.push('/(tabs)/(explore)');
                }}
                style={{
                  backgroundColor: COLORS.primary,
                  borderRadius: 14,
                  paddingVertical: 14,
                  paddingHorizontal: 28,
                }}
              >
                <Text style={{ color: '#FFFFFF', fontSize: 15, fontWeight: '600', fontFamily: 'DMSans_600SemiBold' }}>
                  Explore pods
                </Text>
              </AnimatedPressable>
            </View>
          }
        />
      )}
    </AuthGuard>
  );
}
