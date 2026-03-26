import { Stack } from 'expo-router';
import { useColors } from '@/hooks/useColors';

export default function LocationLayout() {
  const COLORS = useColors();
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        headerStyle: { backgroundColor: COLORS.background },
        headerTintColor: COLORS.text,
        headerTitleStyle: { fontFamily: 'DMSans_600SemiBold', fontSize: 17 },
        headerShadowVisible: false,
        headerBackButtonDisplayMode: 'minimal',
      }}
    />
  );
}
