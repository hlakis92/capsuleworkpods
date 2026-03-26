import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import * as Linking from 'expo-linking';
import { useColors } from '@/hooks/useColors';
import { useAuth } from '@/contexts/AuthContext';
import { capsuleGet, capsulePost } from '@/utils/capsuleApi';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { AnimatedListItem } from '@/components/AnimatedListItem';
import { SkeletonLine } from '@/components/SkeletonLoader';
import { StatusBadge } from '@/components/StatusBadge';
import { Check, Crown, Zap, Star } from 'lucide-react-native';

interface MembershipTier {
  tier: string;
  name: string;
  monthly_price: number;
  discount_percent: number;
  description: string;
  features?: string[];
}

interface UserProfile {
  membership_tier: string;
}

export default function MembershipScreen() {
  const COLORS = useColors();
  const router = useRouter();
  const { user } = useAuth();

  const [tiers, setTiers] = useState<MembershipTier[]>([]);
  const [currentTier, setCurrentTier] = useState('free');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [upgradingTier, setUpgradingTier] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    console.log('[Membership] Fetching tiers and user profile');
    try {
      const promises: [Promise<{ tiers: MembershipTier[] }>, Promise<UserProfile>?] = [
        capsuleGet<{ tiers: MembershipTier[] }>('/api/membership-tiers'),
      ];
      if (user) {
        promises.push(capsuleGet<UserProfile>('/api/users/me'));
      }
      const [tiersData, profileData] = await Promise.all(promises);
      setTiers(tiersData.tiers || []);
      if (profileData) {
        setCurrentTier(profileData.membership_tier || 'free');
      }
    } catch (e) {
      console.error('[Membership] Failed to fetch:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = useCallback(() => {
    console.log('[Membership] Pull to refresh');
    setRefreshing(true);
    fetchData();
  }, [fetchData]);

  const handleUpgrade = async (tier: string) => {
    if (!user) {
      console.log('[Membership] Not logged in, redirecting to auth');
      router.push('/auth-screen');
      return;
    }
    console.log('[Membership] Upgrade pressed for tier:', tier);
    setUpgradingTier(tier);
    try {
      const data = await capsulePost<{ url: string; checkout_url?: string }>('/api/membership/upgrade', { tier });
      const url = data.url || data.checkout_url || '';
      if (url) {
        console.log('[Membership] Opening upgrade URL');
        await Linking.openURL(url);
      }
    } catch (e) {
      console.error('[Membership] Upgrade failed:', e);
    } finally {
      setUpgradingTier(null);
    }
  };

  const tierOrder = ['free', 'plus', 'pro'];
  const sortedTiers = [...tiers].sort(
    (a, b) => tierOrder.indexOf(a.tier) - tierOrder.indexOf(b.tier)
  );

  const getTierIcon = (tier: string) => {
    if (tier === 'pro') return <Crown size={22} color="#B45309" />;
    if (tier === 'plus') return <Star size={22} color={COLORS.primary} />;
    return <Zap size={22} color={COLORS.textSecondary} />;
  };

  const getTierBg = (tier: string) => {
    if (tier === 'pro') return 'rgba(245,158,11,0.10)';
    if (tier === 'plus') return COLORS.primaryMuted;
    return COLORS.surfaceSecondary;
  };

  const getTierBorder = (tier: string, isCurrent: boolean) => {
    if (isCurrent) {
      if (tier === 'pro') return '#F59E0B';
      if (tier === 'plus') return COLORS.primary;
      return COLORS.border;
    }
    return COLORS.border;
  };

  const priceDisplay = (price: number) => {
    if (price === 0) return 'Free';
    return `$${Number(price).toFixed(2)}/mo`;
  };

  return (
    <>
      <Stack.Screen options={{ title: 'Membership Plans' }} />
      <ScrollView
        style={{ flex: 1, backgroundColor: COLORS.background }}
        contentContainerStyle={{ paddingBottom: 60 }}
        showsVerticalScrollIndicator={false}
        contentInsetAdjustmentBehavior="automatic"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={COLORS.primary} />
        }
      >
        {/* Header */}
        <View
          style={{
            backgroundColor: '#1B2B4B',
            padding: 24,
            paddingTop: 32,
            paddingBottom: 32,
            alignItems: 'center',
            gap: 8,
          }}
        >
          <View
            style={{
              width: 56,
              height: 56,
              borderRadius: 16,
              backgroundColor: 'rgba(245,158,11,0.2)',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: 4,
            }}
          >
            <Crown size={28} color="#F59E0B" />
          </View>
          <Text
            style={{
              fontSize: 24,
              fontWeight: '800',
              color: '#FFFFFF',
              fontFamily: 'DMSans_700Bold',
              letterSpacing: -0.5,
              textAlign: 'center',
            }}
          >
            Upgrade your plan
          </Text>
          <Text
            style={{
              fontSize: 15,
              color: 'rgba(255,255,255,0.65)',
              fontFamily: 'DMSans_400Regular',
              textAlign: 'center',
              lineHeight: 22,
            }}
          >
            Save on every booking with a membership discount
          </Text>
        </View>

        {/* Tier cards */}
        <View style={{ padding: 16, gap: 14 }}>
          {loading ? (
            [0, 1, 2].map((i) => (
              <View
                key={i}
                style={{
                  backgroundColor: COLORS.surface,
                  borderRadius: 20,
                  padding: 20,
                  borderWidth: 1,
                  borderColor: COLORS.border,
                  gap: 12,
                }}
              >
                <SkeletonLine width="50%" height={20} />
                <SkeletonLine width="30%" height={16} />
                <SkeletonLine width="80%" height={14} />
                <SkeletonLine width="60%" height={14} />
              </View>
            ))
          ) : (
            sortedTiers.map((tier, index) => {
              const isCurrent = tier.tier === currentTier;
              const isUpgradeTarget = tierOrder.indexOf(tier.tier) > tierOrder.indexOf(currentTier);
              const isDowngrade = tierOrder.indexOf(tier.tier) < tierOrder.indexOf(currentTier);
              const isUpgrading = upgradingTier === tier.tier;

              return (
                <AnimatedListItem key={tier.tier} index={index}>
                  <View
                    style={{
                      backgroundColor: isCurrent ? getTierBg(tier.tier) : COLORS.surface,
                      borderRadius: 20,
                      padding: 20,
                      borderWidth: isCurrent ? 2 : 1,
                      borderColor: getTierBorder(tier.tier, isCurrent),
                      gap: 16,
                    }}
                  >
                    {/* Header row */}
                    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                        <View
                          style={{
                            width: 44,
                            height: 44,
                            borderRadius: 13,
                            backgroundColor: getTierBg(tier.tier),
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          {getTierIcon(tier.tier)}
                        </View>
                        <View>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <Text
                              style={{
                                fontSize: 18,
                                fontWeight: '700',
                                color: COLORS.text,
                                fontFamily: 'DMSans_700Bold',
                              }}
                            >
                              {tier.name || (tier.tier === 'free' ? 'Free' : tier.tier === 'plus' ? 'Plus' : 'Pro')}
                            </Text>
                            {isCurrent && (
                              <View
                                style={{
                                  backgroundColor: tier.tier === 'pro' ? 'rgba(245,158,11,0.15)' : COLORS.primaryMuted,
                                  borderRadius: 6,
                                  paddingHorizontal: 8,
                                  paddingVertical: 3,
                                }}
                              >
                                <Text
                                  style={{
                                    fontSize: 11,
                                    fontWeight: '600',
                                    color: tier.tier === 'pro' ? '#B45309' : COLORS.primary,
                                    fontFamily: 'DMSans_600SemiBold',
                                  }}
                                >
                                  Current
                                </Text>
                              </View>
                            )}
                          </View>
                          <Text
                            style={{
                              fontSize: 20,
                              fontWeight: '800',
                              color: COLORS.text,
                              fontFamily: 'DMSans_700Bold',
                              letterSpacing: -0.3,
                            }}
                          >
                            {priceDisplay(tier.monthly_price)}
                          </Text>
                        </View>
                      </View>
                      <StatusBadge status={tier.tier} type="membership" />
                    </View>

                    {/* Description */}
                    {tier.description ? (
                      <Text
                        style={{
                          fontSize: 14,
                          color: COLORS.textSecondary,
                          fontFamily: 'DMSans_400Regular',
                          lineHeight: 20,
                        }}
                      >
                        {tier.description}
                      </Text>
                    ) : null}

                    {/* Discount badge */}
                    {tier.discount_percent > 0 && (
                      <View
                        style={{
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: 8,
                          backgroundColor: COLORS.accentMuted,
                          borderRadius: 10,
                          paddingHorizontal: 12,
                          paddingVertical: 8,
                          alignSelf: 'flex-start',
                        }}
                      >
                        <Zap size={14} color={COLORS.accent} />
                        <Text
                          style={{
                            fontSize: 13,
                            fontWeight: '700',
                            color: COLORS.accent,
                            fontFamily: 'DMSans_700Bold',
                          }}
                        >
                          {tier.discount_percent}% off all bookings
                        </Text>
                      </View>
                    )}

                    {/* Features list */}
                    {tier.features && tier.features.length > 0 && (
                      <View style={{ gap: 8 }}>
                        {tier.features.map((feature, fi) => (
                          <View key={fi} style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
                            <View
                              style={{
                                width: 20,
                                height: 20,
                                borderRadius: 10,
                                backgroundColor: COLORS.accentMuted,
                                alignItems: 'center',
                                justifyContent: 'center',
                              }}
                            >
                              <Check size={12} color={COLORS.accent} strokeWidth={2.5} />
                            </View>
                            <Text style={{ fontSize: 13, color: COLORS.text, fontFamily: 'DMSans_400Regular', flex: 1 }}>
                              {feature}
                            </Text>
                          </View>
                        ))}
                      </View>
                    )}

                    {/* CTA button */}
                    {isUpgradeTarget && (
                      <AnimatedPressable
                        onPress={() => handleUpgrade(tier.tier)}
                        disabled={isUpgrading}
                        style={{
                          backgroundColor: tier.tier === 'pro' ? '#F59E0B' : '#1B2B4B',
                          borderRadius: 14,
                          paddingVertical: 15,
                          alignItems: 'center',
                          flexDirection: 'row',
                          justifyContent: 'center',
                          gap: 8,
                        }}
                      >
                        {isUpgrading ? (
                          <ActivityIndicator color="#FFFFFF" />
                        ) : (
                          <>
                            {getTierIcon(tier.tier)}
                            <Text
                              style={{
                                color: '#FFFFFF',
                                fontSize: 16,
                                fontWeight: '700',
                                fontFamily: 'DMSans_700Bold',
                              }}
                            >
                              Upgrade to {tier.tier === 'plus' ? 'Plus' : 'Pro'}
                            </Text>
                          </>
                        )}
                      </AnimatedPressable>
                    )}

                    {isCurrent && tier.tier !== 'free' && (
                      <View
                        style={{
                          backgroundColor: COLORS.surfaceSecondary,
                          borderRadius: 12,
                          paddingVertical: 12,
                          alignItems: 'center',
                        }}
                      >
                        <Text style={{ fontSize: 14, color: COLORS.textSecondary, fontFamily: 'DMSans_500Medium' }}>
                          Your current plan
                        </Text>
                      </View>
                    )}

                    {isDowngrade && (
                      <View
                        style={{
                          borderRadius: 12,
                          paddingVertical: 12,
                          alignItems: 'center',
                        }}
                      >
                        <Text style={{ fontSize: 13, color: COLORS.textTertiary, fontFamily: 'DMSans_400Regular' }}>
                          Downgrade not available in-app
                        </Text>
                      </View>
                    )}
                  </View>
                </AnimatedListItem>
              );
            })
          )}
        </View>

        {/* Footer note */}
        <View style={{ paddingHorizontal: 20, paddingBottom: 20, alignItems: 'center' }}>
          <Text
            style={{
              fontSize: 12,
              color: COLORS.textTertiary,
              fontFamily: 'DMSans_400Regular',
              textAlign: 'center',
              lineHeight: 18,
            }}
          >
            Subscriptions are billed monthly. Cancel anytime. Prices in USD.
          </Text>
        </View>
      </ScrollView>
    </>
  );
}
