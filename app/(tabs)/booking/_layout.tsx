import { Stack } from 'expo-router';
import { useColors } from '@/hooks/useColors';

export default function BookingLayout() {
  const COLORS = useColors();
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: COLORS.background },
        headerTintColor: COLORS.text,
        headerTitleStyle: { fontFamily: 'DMSans_600SemiBold', fontSize: 17 },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="[id]" options={{ title: 'Booking Details' }} />
    </Stack>
  );
}
