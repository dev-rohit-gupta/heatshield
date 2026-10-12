import '@/features/shifts/background-location-task';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { colors } from '@/theme/colors';
import { ShiftProvider } from '@/features/shifts/shift-provider';

export default function RootLayout() {
  return (
    <ShiftProvider>
      <StatusBar style="dark" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }} />
    </ShiftProvider>
  );
}
