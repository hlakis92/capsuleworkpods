import { Tabs } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useColors } from '@/hooks/useColors';
import { Compass, MapPin, CalendarDays, User, LucideIcon } from 'lucide-react-native';

function TabBarIcon({ Icon, focused, color }: { Icon: LucideIcon; focused: boolean; color: string }) {
  return <Icon size={22} color={color} strokeWidth={focused ? 2.5 : 2} />;
}

export default function TabLayout() {
  const COLORS = useColors();
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: COLORS.surface,
          borderTopWidth: 1,
          borderTopColor: COLORS.border,
          paddingBottom: insets.bottom,
          height: 56 + insets.bottom,
        },
        tabBarActiveTintColor: COLORS.primary,
        tabBarInactiveTintColor: COLORS.textTertiary,
        tabBarLabelStyle: {
          fontSize: 11,
          fontFamily: 'DMSans_500Medium',
          marginTop: -2,
        },
      }}
    >
      <Tabs.Screen
        name="(explore)"
        options={{
          title: 'Explore',
          tabBarIcon: ({ focused, color }) => <TabBarIcon Icon={Compass} focused={focused} color={color} />,
        }}
      />
      <Tabs.Screen
        name="(locations)"
        options={{
          title: 'Locations',
          tabBarIcon: ({ focused, color }) => <TabBarIcon Icon={MapPin} focused={focused} color={color} />,
        }}
      />
      <Tabs.Screen
        name="(bookings)"
        options={{
          title: 'Bookings',
          tabBarIcon: ({ focused, color }) => <TabBarIcon Icon={CalendarDays} focused={focused} color={color} />,
        }}
      />
      <Tabs.Screen
        name="(profile)"
        options={{
          title: 'Profile',
          tabBarIcon: ({ focused, color }) => <TabBarIcon Icon={User} focused={focused} color={color} />,
        }}
      />
      <Tabs.Screen name="location" options={{ href: null }} />
      <Tabs.Screen name="pod" options={{ href: null }} />
      <Tabs.Screen name="booking" options={{ href: null }} />
      <Tabs.Screen name="booking-wizard" options={{ href: null }} />
    </Tabs>
  );
}
