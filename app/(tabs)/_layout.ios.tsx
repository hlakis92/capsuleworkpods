import { NativeTabs, Icon, Label } from 'expo-router/unstable-native-tabs';

export default function TabLayoutIOS() {
  return (
    <NativeTabs>
      <NativeTabs.Trigger name="(explore)">
        <Icon sf="safari" />
        <Label>Explore</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="(nearby)">
        <Icon sf="mappin.and.ellipse" />
        <Label>Near Me</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="(bookings)">
        <Icon sf="calendar" />
        <Label>Bookings</Label>
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="(profile)">
        <Icon sf="person.circle" />
        <Label>Profile</Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
