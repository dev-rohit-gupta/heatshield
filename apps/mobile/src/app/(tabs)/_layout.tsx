import { Tabs } from 'expo-router';
import { Text } from 'react-native';
import { colors } from '@/theme/colors';

const symbols = { home: '⌂', routes: '↗', activity: '▥', profile: '●' } as const;

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.brand,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border, height: 64 },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '700', paddingBottom: 5 },
      }}
    >
      <Tabs.Screen name="index" options={{ title: 'Home', tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 22 }}>{symbols.home}</Text> }} />
      <Tabs.Screen name="routes" options={{ title: 'Routes', tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 22 }}>{symbols.routes}</Text> }} />
      <Tabs.Screen name="activity" options={{ title: 'Activity', tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 22 }}>{symbols.activity}</Text> }} />
      <Tabs.Screen name="profile" options={{ title: 'Profile', tabBarIcon: ({ color }) => <Text style={{ color, fontSize: 22 }}>{symbols.profile}</Text> }} />
    </Tabs>
  );
}
