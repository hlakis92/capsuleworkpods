import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/contexts/AuthContext';
import { capsuleGet, capsulePost } from '@/utils/capsuleApi';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { AuthGuard } from '@/components/AuthGuard';
import { StatusBadge } from '@/components/StatusBadge';
import { SkeletonLine } from '@/components/SkeletonLoader';
import { AnimatedListItem } from '@/components/AnimatedListItem';
import { LogOut, Crown, Star, Zap, CalendarDays, ChevronRight } from 'lucide-react-native';

interface MembershipTier {
  tier: string;
  monthly_price: number;
  discount_percent: number;
  description: string;
}

interface UserProfile {
  id: string;
  name: string;
  email: string;
  picture?: string;
  membership_tier: string;
}

interface BookingStats {
  total: number;
}

export default function ProfileScreen() {
  const COLORS = useColors();
  const router = useRouter();
  const params = useLocalSearchParams<{ upgrade?: string; session_id?: string }>();
  const { user, loading: authLoading, signOut } = useAuth();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [tiers, setTiers] = useState<MembershipTier[]>([]);
  const [bookingStats, setBookingStats] = useState<BookingStats>({ total: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const fetchData = useCallback(async () => {
    if (!user) return;
    console.log('[Profile] Fetching profile, tiers, and booking stats');
    try {
      const [profileData, tiersData, bookingsData] = await Promise.all([
        capsuleGet<UserProfile>('/api/users/me'),
        capsuleGet<{ tiers: MembershipTier[] }>('/api/membership-tiers'),
        capsuleGet<{ bookings: unknown[] }>('/api/bookings').catch(() => ({ bookings: [] })),
      ]);
      setProfile(profileData);
      setTiers(tiersData.tiers || []);
      setBookingStats({ total: (bookingsData.bookings || []).length });
    } catch (e: unknown) {
      console.error('[Profile] Failed to fetch data:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  // Handle upgrade return from Stripe
  useEffect(() => {
    if (params.upgrade === 'success' && params.session_id) {
      console.log('[Profile] Upgrade success, verifying session:', params.session_id);
      capsulePost('/api/membership/verify', { session_id: params.session_id })
        .then(() => {
          console.log('[Profile] Membership verified, refreshing profile');
          fetchData();
        })
        .catch((e) => console.error('[Profile] Membership verify failed:', e));
    }
  }, [params.upgrade, params.session_id, fetchData]);

  useEffect(() => {
    if (user) fetchData();
    else setLoading(false);
  }, [user, fetchData]);

  const onRefresh = useCallback(() => {
    console.log('[Profile] Pull to refresh');
    setRefreshing(true);
    fetchData();
  }, [fetchData]);

  const handleSignOut = async () => {
    console.log('[Profile] Sign out pressed');
    setSigningOut(true);
    try {
      await signOut();
      router.replace('/auth-screen');
    } catch (e: unknown) {
      console.error('[Profile] Sign out failed:', e);
    } finally {
      setSigningOut(false);
    }
  };

  const displayName = profile?.name || user?.name || user?.email?.split('@')[0] || 'User';
  const displayEmail = profile?.email || user?.email || '';
  const initials = displayName.slice(0, 2).toUpperCase();
  const membershipTier = profile?.membership_tier || 'free';
  const currentTier = tiers.find((t) => t.tier === membershipTier);

  const tierLabel = membershipTier === 'free' ? 'Free Plan' : membershipTier === 'plus' ? 'Plus Plan' : 'Pro Plan';
  const discountText = currentTier && currentTier.discount_percent > 0
    ? `${currentTier.discount_percent}% off all bookings`
    : 'No booking discount';

  return (
    <AuthGuard user={user} loading={authLoading}>
      <ScrollView
        style={{ flex: 1, backgroundColor: COLORS.background }}
        contentContainerStyle={{ paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="automatic"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
        }
      >
        {/* Profile header */}
        <AnimatedListItem index={0}>
          <View
            style={{
              backgroundColor: COLORS.surface,
              margin: 16,
              borderRadius: 20,
              padding: 20,
              borderWidth: 1,
              borderColor: COLORS.border,
              boxShadow: COLORS.cardShadow,
              alignItems: 'center',
              gap: 12,
            }}
          >
            <View
              style={{
                width: 80,
                height: 80,
                borderRadius: 40,
                backgroundColor: '#1B2B4B',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Text
                style={{
                  fontSize: 28,
                  fontWeight: '700',
                  color: '#FFFFFF',
                  fontFamily: 'DMSans_700Bold',
                }}
              >
                {initials}
              </Text>
            </View>

            {loading ? (
              <View style={{ alignItems: 'center', gap: 8 }}>
                <SkeletonLine width={140} height={20} />
                <SkeletonLine width={180} height={14} />
              </View>
            ) : (
              <View style={{ alignItems: 'center', gap: 4 }}>
                <Text
                  style={{
                    fontSize: 20,
                    fontWeight: '700',
                    color: COLORS.text,
                    fontFamily: 'DMSans_700Bold',
                    letterSpacing: -0.3,
                  }}
                >
                  {displayName}
                </Text>
                <Text
                  style={{
                    fontSize: 14,
                    color: COLORS.textSecondary,
                    fontFamily: 'DMSans_400Regular',
                  }}
                  selectable
                >
                  {displayEmail}
                </Text>
                <View style={{ marginTop: 4 }}>
                  <StatusBadge status={membershipTier} type="membership" />
                </View>
              </View>
            )}

            {/* Booking stats */}
            {!loading && (
              <View
                style={{
                  flexDirection: 'row',
                  backgroundColor: COLORS.surfaceSecondary,
                  borderRadius: 12,
                  padding: 12,
                  width: '100%',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                }}
              >
                <CalendarDays size={16} color={COLORS.primary} />
                <Text style={{ fontSize: 14, color: COLORS.text, fontFamily: 'DMSans_600SemiBold' }}>
                  {bookingStats.total}
                </Text>
                <Text style={{ fontSize: 14, color: COLORS.textSecondary, fontFamily: 'DMSans_400Regular' }}>
                  {bookingStats.total === 1 ? 'booking' : 'bookings'} total
                </Text>
              </View>
            )}
          </View>
        </AnimatedListItem>

        {/* Membership card */}
        <AnimatedListItem index={1}>
          <View
            style={{
              backgroundColor: COLORS.surface,
              marginHorizontal: 16,
              borderRadius: 20,
              padding: 20,
              borderWidth: 1,
              borderColor: COLORS.border,
              boxShadow: COLORS.cardShadow,
              gap: 16,
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 12,
                  backgroundColor: membershipTier === 'pro'
                    ? 'rgba(245,158,11,0.12)'
                    : membershipTier === 'plus'
                    ? COLORS.primaryMuted
                    : COLORS.surfaceSecondary,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Crown
                  size={20}
                  color={
                    membershipTier === 'pro'
                      ? '#B45309'
                      : membershipTier === 'plus'
                      ? COLORS.primary
                      : COLORS.textSecondary
                  }
                />
              </View>
              <View style={{ flex: 1 }}>
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: '700',
                    color: COLORS.text,
                    fontFamily: 'DMSans_700Bold',
                  }}
                >
                  {tierLabel}
                </Text>
                <Text
                  style={{
                    fontSize: 13,
                    color: COLORS.textSecondary,
                    fontFamily: 'DMSans_400Regular',
                  }}
                >
                  {discountText}
                </Text>
              </View>
            </View>

            {currentTier?.description ? (
              <Text
                style={{
                  fontSize: 14,
                  color: COLORS.textSecondary,
                  fontFamily: 'DMSans_400Regular',
                  lineHeight: 20,
                }}
              >
                {currentTier.description}
              </Text>
            ) : null}

            {membershipTier !== 'pro' && (
              <AnimatedPressable
                onPress={() => {
                  console.log('[Profile] Upgrade membership pressed');
                  router.push('/membership');
                }}
                style={{
                  backgroundColor: '#1B2B4B',
                  borderRadius: 12,
                  paddingVertical: 13,
                  alignItems: 'center',
                  flexDirection: 'row',
                  justifyContent: 'center',
                  gap: 8,
                }}
              >
                <Star size={16} color="#F59E0B" />
                <Text
                  style={{
                    color: '#FFFFFF',
                    fontSize: 15,
                    fontWeight: '600',
                    fontFamily: 'DMSans_600SemiBold',
                  }}
                >
                  Upgrade membership
                </Text>
              </AnimatedPressable>
            )}
          </View>
        </AnimatedListItem>

        {/* Quick actions */}
        <AnimatedListItem index={2}>
          <View
            style={{
              backgroundColor: COLORS.surface,
              marginHorizontal: 16,
              marginTop: 12,
              borderRadius: 20,
              borderWidth: 1,
              borderColor: COLORS.border,
              boxShadow: COLORS.cardShadow,
              overflow: 'hidden',
            }}
          >
            <AnimatedPressable
              onPress={() => {
                console.log('[Profile] My bookings pressed');
                router.push('/(tabs)/(bookings)');
              }}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                padding: 16,
                gap: 12,
              }}
            >
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
                <CalendarDays size={18} color={COLORS.primary} />
              </View>
              <Text style={{ flex: 1, fontSize: 15, color: COLORS.text, fontFamily: 'DMSans_500Medium' }}>
                My bookings
              </Text>
              <ChevronRight size={18} color={COLORS.textTertiary} />
            </AnimatedPressable>

            <View style={{ height: 1, backgroundColor: COLORS.divider, marginLeft: 64 }} />

            <AnimatedPressable
              onPress={() => {
                console.log('[Profile] Membership plans pressed');
                router.push('/membership');
              }}
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                padding: 16,
                gap: 12,
              }}
            >
              <View
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: 10,
                  backgroundColor: 'rgba(245,158,11,0.12)',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Zap size={18} color="#B45309" />
              </View>
              <Text style={{ flex: 1, fontSize: 15, color: COLORS.text, fontFamily: 'DMSans_500Medium' }}>
                Membership plans
              </Text>
              <ChevronRight size={18} color={COLORS.textTertiary} />
            </AnimatedPressable>
          </View>
        </AnimatedListItem>

        {/* Sign out */}
        <AnimatedListItem index={3}>
          <View style={{ marginHorizontal: 16, marginTop: 12 }}>
            <AnimatedPressable
              onPress={handleSignOut}
              disabled={signingOut}
              style={{
                backgroundColor: COLORS.dangerMuted,
                borderRadius: 16,
                paddingVertical: 16,
                alignItems: 'center',
                flexDirection: 'row',
                justifyContent: 'center',
                gap: 10,
              }}
            >
              <LogOut size={18} color={COLORS.danger} />
              <Text
                style={{
                  color: COLORS.danger,
                  fontSize: 16,
                  fontWeight: '600',
                  fontFamily: 'DMSans_600SemiBold',
                }}
              >
                {signingOut ? 'Signing out...' : 'Sign out'}
              </Text>
            </AnimatedPressable>
          </View>
        </AnimatedListItem>

        <View style={{ alignItems: 'center', marginTop: 32, paddingBottom: 8 }}>
          <Text
            style={{
              fontSize: 12,
              color: COLORS.textTertiary,
              fontFamily: 'DMSans_400Regular',
            }}
          >
            Capsule WorkPods v1.0.0
          </Text>
        </View>
      </ScrollView>
    </AuthGuard>
  );
}
