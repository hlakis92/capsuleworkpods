import { View, Text } from 'react-native';
import { useRouter } from 'expo-router';
import { useColors } from '@/hooks/useColors';
import { AnimatedPressable } from '@/components/AnimatedPressable';
import { LogIn } from 'lucide-react-native';

interface AuthGuardProps {
  children: React.ReactNode;
  loading: boolean;
  user: { id: string; email: string; name?: string } | null;
}

export function AuthGuard({ children, loading, user }: AuthGuardProps) {
  const COLORS = useColors();
  const router = useRouter();

  if (loading) return null;

  if (!user) {
    return (
      <View
        style={{
          flex: 1,
          backgroundColor: COLORS.background,
          alignItems: 'center',
          justifyContent: 'center',
          padding: 32,
          gap: 20,
        }}
      >
        <View
          style={{
            width: 72,
            height: 72,
            borderRadius: 20,
            backgroundColor: COLORS.primaryMuted,
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <LogIn size={32} color={COLORS.primary} />
        </View>
        <View style={{ alignItems: 'center', gap: 8 }}>
          <Text
            style={{
              fontSize: 22,
              fontWeight: '700',
              color: COLORS.text,
              fontFamily: 'DMSans_700Bold',
              textAlign: 'center',
            }}
          >
            Sign in to continue
          </Text>
          <Text
            style={{
              fontSize: 15,
              color: COLORS.textSecondary,
              fontFamily: 'DMSans_400Regular',
              textAlign: 'center',
              lineHeight: 22,
              maxWidth: 280,
            }}
          >
            Create an account or sign in to access your bookings and profile.
          </Text>
        </View>
        <AnimatedPressable
          onPress={() => {
            console.log('[AuthGuard] Sign in button pressed');
            router.push('/auth-screen');
          }}
          style={{
            backgroundColor: COLORS.primary,
            borderRadius: 14,
            paddingVertical: 16,
            paddingHorizontal: 40,
            alignItems: 'center',
          }}
        >
          <Text
            style={{
              color: '#FFFFFF',
              fontSize: 16,
              fontWeight: '600',
              fontFamily: 'DMSans_600SemiBold',
            }}
          >
            Sign in
          </Text>
        </AnimatedPressable>
      </View>
    );
  }

  return <>{children}</>;
}
