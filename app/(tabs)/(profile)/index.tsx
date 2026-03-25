import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/contexts/AuthContext';
import { apiGet } from '@/utils/api';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { AuthGuard } from '@/components/AuthGuard';
import { StatusBadge } from '@/components/StatusBadge';
import { SkeletonLine } from '@/components/SkeletonLoader';
import { AnimatedListItem } from '@/components/AnimatedListItem';
import { LogOut, Crown, Star, Zap } from 'lucide-react-native';

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
  membership_tier: string;
}

export default function ProfileScreen() {
  const COLORS = useColors();
  const router = useRouter();
  const { user, loading: authLoading, signOut } = useAuth();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [tiers, setTiers] = useState<MembershipTier[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showTiers, setShowTiers] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  const fetchData = useCallback(async () => {
    if (!user) return;
    console.log('[Profile] Fetching profile and membership tiers');
    try {
      const [profileData, tiersData] = await Promise.all([
        apiGet<UserProfile>('/api/users/me'),
        apiGet<{ tiers: MembershipTier[] }>('/api/membership-tiers'),
      ]);
      setProfile(profileData);
      setTiers(tiersData.tiers || []);
    } catch (e: unknown) {
      console.error('[Profile] Failed to fetch data:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

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
            {/* Avatar */}
            <View
              style={{
                width: 80,
                height: 80,
                borderRadius: 40,
                backgroundColor: COLORS.primary,
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
                  {membershipTier === 'free'
                    ? 'Free Plan'
                    : membershipTier === 'plus'
                    ? 'Plus Plan'
                    : 'Pro Plan'}
                </Text>
                {currentTier ? (
                  <Text
                    style={{
                      fontSize: 13,
                      color: COLORS.textSecondary,
                      fontFamily: 'DMSans_400Regular',
                    }}
                  >
                    {currentTier.discount_percent > 0
                      ? `${currentTier.discount_percent}% off all bookings`
                      : 'No booking discount'}
                  </Text>
                ) : null}
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
                  setShowTiers(!showTiers);
                }}
                style={{
                  backgroundColor: COLORS.primary,
                  borderRadius: 12,
                  paddingVertical: 13,
                  alignItems: 'center',
                  flexDirection: 'row',
                  justifyContent: 'center',
                  gap: 8,
                }}
              >
                <Star size={16} color="#FFFFFF" />
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

        {/* Membership tiers */}
        {showTiers && tiers.length > 0 && (
          <AnimatedListItem index={2}>
            <View
              style={{
                marginHorizontal: 16,
                marginTop: 12,
                gap: 10,
              }}
            >
              <Text
                style={{
                  fontSize: 17,
                  fontWeight: '700',
                  color: COLORS.text,
                  fontFamily: 'DMSans_700Bold',
                  marginBottom: 4,
                }}
              >
                Available plans
              </Text>
              {tiers.map((tier, index) => {
                const isCurrent = tier.tier === membershipTier;
                const priceStr = tier.monthly_price === 0
                  ? 'Free'
                  : `$${Number(tier.monthly_price).toFixed(0)}/mo`;
                return (
                  <AnimatedListItem key={tier.tier} index={index}>
                    <View
                      style={{
                        backgroundColor: isCurrent ? COLORS.primaryMuted : COLORS.surface,
                        borderRadius: 16,
                        padding: 16,
                        borderWidth: 1.5,
                        borderColor: isCurrent ? COLORS.primary : COLORS.border,
                        gap: 8,
                      }}
                    >
                      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                          <StatusBadge status={tier.tier} type="membership" />
                          {isCurrent && (
                            <Text style={{ fontSize: 12, color: COLORS.primary, fontFamily: 'DMSans_600SemiBold' }}>
                              Current
                            </Text>
                          )}
                        </View>
                        <Text
                          style={{
                            fontSize: 17,
                            fontWeight: '800',
                            color: COLORS.text,
                            fontFamily: 'DMSans_700Bold',
                          }}
                        >
                          {priceStr}
                        </Text>
                      </View>
                      <Text
                        style={{
                          fontSize: 13,
                          color: COLORS.textSecondary,
                          fontFamily: 'DMSans_400Regular',
                          lineHeight: 18,
                        }}
                      >
                        {tier.description}
                      </Text>
                      {tier.discount_percent > 0 && (
                        <View
                          style={{
                            flexDirection: 'row',
                            alignItems: 'center',
                            gap: 6,
                            backgroundColor: COLORS.accentMuted,
                            borderRadius: 8,
                            paddingHorizontal: 10,
                            paddingVertical: 5,
                            alignSelf: 'flex-start',
                          }}
                        >
                          <Zap size={13} color={COLORS.accent} />
                          <Text style={{ fontSize: 12, color: COLORS.accent, fontFamily: 'DMSans_600SemiBold' }}>
                            {tier.discount_percent}% off all bookings
                          </Text>
                        </View>
                      )}
                    </View>
                  </AnimatedListItem>
                );
              })}
            </View>
          </AnimatedListItem>
        )}

        {/* Sign out */}
        <AnimatedListItem index={3}>
          <View style={{ marginHorizontal: 16, marginTop: 20 }}>
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

        {/* App version */}
        <View style={{ alignItems: 'center', marginTop: 32, paddingBottom: 8 }}>
          <Text
            style={{
              fontSize: 12,
              color: COLORS.textTertiary,
              fontFamily: 'DMSans_400Regular',
            }}
          >
            Capsule v1.0.0
          </Text>
        </View>
      </ScrollView>
    </AuthGuard>
  );
}
