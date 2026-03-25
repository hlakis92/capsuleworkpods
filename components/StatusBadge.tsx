import { View, Text } from 'react-native';
import { useColors } from '@/hooks/useColors';

type BookingStatus = 'pending' | 'confirmed' | 'cancelled' | 'completed';
type PaymentStatus = 'unpaid' | 'paid' | 'refunded';
type PodType = 'standard' | 'premium' | 'executive' | 'quiet' | 'family';
type MembershipTier = 'free' | 'plus' | 'pro';

interface StatusBadgeProps {
  status: BookingStatus | PaymentStatus | PodType | MembershipTier | string;
  type?: 'booking' | 'payment' | 'pod' | 'membership';
}

export function StatusBadge({ status, type = 'booking' }: StatusBadgeProps) {
  const COLORS = useColors();

  const getColors = () => {
    if (type === 'booking') {
      switch (status) {
        case 'pending': return { bg: COLORS.warningMuted, text: COLORS.warning };
        case 'confirmed': return { bg: COLORS.accentMuted, text: COLORS.accent };
        case 'cancelled': return { bg: COLORS.dangerMuted, text: COLORS.danger };
        case 'completed': return { bg: COLORS.surfaceSecondary, text: COLORS.textSecondary };
        default: return { bg: COLORS.surfaceSecondary, text: COLORS.textSecondary };
      }
    }
    if (type === 'payment') {
      switch (status) {
        case 'unpaid': return { bg: COLORS.warningMuted, text: COLORS.warning };
        case 'paid': return { bg: COLORS.accentMuted, text: COLORS.accent };
        case 'refunded': return { bg: COLORS.surfaceSecondary, text: COLORS.textSecondary };
        default: return { bg: COLORS.surfaceSecondary, text: COLORS.textSecondary };
      }
    }
    if (type === 'pod') {
      switch (status) {
        case 'standard': return { bg: COLORS.surfaceSecondary, text: COLORS.textSecondary };
        case 'premium': return { bg: COLORS.primaryMuted, text: COLORS.primary };
        case 'executive': return { bg: 'rgba(245,158,11,0.12)', text: '#B45309' };
        case 'quiet': return { bg: COLORS.accentMuted, text: COLORS.accent };
        case 'family': return { bg: 'rgba(168,85,247,0.12)', text: '#7C3AED' };
        default: return { bg: COLORS.surfaceSecondary, text: COLORS.textSecondary };
      }
    }
    if (type === 'membership') {
      switch (status) {
        case 'free': return { bg: COLORS.surfaceSecondary, text: COLORS.textSecondary };
        case 'plus': return { bg: COLORS.primaryMuted, text: COLORS.primary };
        case 'pro': return { bg: 'rgba(245,158,11,0.12)', text: '#B45309' };
        default: return { bg: COLORS.surfaceSecondary, text: COLORS.textSecondary };
      }
    }
    return { bg: COLORS.surfaceSecondary, text: COLORS.textSecondary };
  };

  const { bg, text } = getColors();
  const label = String(status).charAt(0).toUpperCase() + String(status).slice(1);

  return (
    <View
      style={{
        backgroundColor: bg,
        borderRadius: 8,
        paddingHorizontal: 10,
        paddingVertical: 4,
        alignSelf: 'flex-start',
      }}
    >
      <Text style={{ color: text, fontSize: 12, fontWeight: '600', fontFamily: 'DMSans_600SemiBold' }}>
        {label}
      </Text>
    </View>
  );
}
