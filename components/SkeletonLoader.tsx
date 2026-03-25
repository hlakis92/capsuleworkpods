import { useEffect, useRef } from 'react';
import { Animated, View, ViewStyle, StyleProp } from 'react-native';
import { useColors } from '@/hooks/useColors';

interface SkeletonLineProps {
  width: number | string;
  height?: number;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
}

export function SkeletonLine({ width, height = 14, borderRadius, style }: SkeletonLineProps) {
  const COLORS = useColors();
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.7, duration: 800, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          borderRadius: borderRadius ?? height / 2,
          backgroundColor: COLORS.surfaceSecondary,
          opacity,
        },
        style,
      ]}
    />
  );
}

export function SkeletonCard() {
  const COLORS = useColors();
  return (
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
      <SkeletonLine width="100%" height={140} borderRadius={12} />
      <SkeletonLine width="70%" height={16} />
      <SkeletonLine width="50%" height={13} />
      <SkeletonLine width="40%" height={13} />
    </View>
  );
}

export function SkeletonBookingCard() {
  const COLORS = useColors();
  return (
    <View
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
      <View style={{ flex: 1, gap: 10 }}>
        <SkeletonLine width="80%" height={15} />
        <SkeletonLine width="60%" height={13} />
        <SkeletonLine width="50%" height={13} />
      </View>
    </View>
  );
}
