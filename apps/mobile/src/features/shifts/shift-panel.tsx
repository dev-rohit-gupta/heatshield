import { Pressable, StyleSheet, Text, View } from 'react-native';
import { summarizeShift } from '@heatshield/heat-engine';
import { useShift } from './shift-provider';
import { colors } from '@/theme/colors';

type Environment = 'OUTDOORS' | 'INDOORS' | 'UNKNOWN';
const environmentalOptions: { label: string; value: Environment }[] = [
  { label: 'Outdoors', value: 'OUTDOORS' },
  { label: 'Indoors', value: 'INDOORS' },
  { label: 'Not sure', value: 'UNKNOWN' },
];
const duration = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
};

export function ShiftPanel() {
  const { data, ready, error, start, end, setEnvironment, setActivity, refreshWeather,
    backgroundEnabled, lastBackgroundSample, enableBackground, disableBackground } = useShift();
  const shift = data.active;
  const summary = shift ? summarizeShift(shift) : null;
  return (
    <View style={styles.panel}>
      <View style={styles.titleRow}>
        <Text style={styles.title}>Your work shift</Text>
        <Text style={styles.status}>{!ready ? 'Loading' : shift ? 'ACTIVE' : 'NOT STARTED'}</Text>
      </View>
      <Text style={styles.note}>Shifts stay on this device. Completed summaries are queued for later secure sync; no cloud upload occurs yet.</Text>
      {error ? <Text style={styles.error} accessibilityRole="alert">{error}</Text> : null}
      {!shift ? (
        <Pressable disabled={!ready} style={[styles.primary, !ready && styles.disabled]}
          accessibilityRole="button" onPress={() => void start()}>
          <Text style={styles.primaryLabel}>Start shift</Text>
        </Pressable>
      ) : (
        <>
          <Text style={styles.small}>Started {new Date(shift.startedAt).toLocaleTimeString()}</Text>
          <Text style={styles.label}>Where are you now?</Text>
          <View style={styles.row}>
            {environmentalOptions.map(item => (
              <Pressable key={item.value} style={[styles.choice, shift.environment === item.value && styles.selected]}
                accessibilityRole="button" accessibilityState={{ selected: shift.environment === item.value }}
                onPress={() => void setEnvironment(item.value)}>
                <Text style={[styles.choiceLabel, shift.environment === item.value && styles.selectedLabel]}>{item.label}</Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.label}>Optional Android background sampling</Text>
          <Text style={styles.small}>Uses a visible Android notification and location permission while enabled. Only sampling timestamps are saved; no raw GPS coordinates. Background time remains unassessed until valid weather evidence is available.</Text>
          <Pressable style={styles.secondary} accessibilityRole="button"
            onPress={() => void (backgroundEnabled ? disableBackground() : enableBackground())}>
            <Text style={styles.secondaryLabel}>{backgroundEnabled ? 'Stop background sampling' : 'Enable background sampling'}</Text>
          </Pressable>
          <Text style={styles.small}>{backgroundEnabled ? 'Background sampling ON' : 'Background sampling OFF'}
            {lastBackgroundSample ? ` · Last sample ${new Date(lastBackgroundSample).toLocaleTimeString()}` : ''}</Text>
          <Text style={styles.label}>Your activity</Text>
          <View style={styles.row}>
            {(['WORKING', 'RESTING'] as const).map(activity => (
              <Pressable key={activity} style={[styles.choice, shift.activity === activity && styles.selected]}
                accessibilityRole="button" accessibilityState={{ selected: shift.activity === activity }}
                onPress={() => void setActivity(activity)}>
                <Text style={[styles.choiceLabel, shift.activity === activity && styles.selectedLabel]}>{activity === 'WORKING' ? 'Working' : 'Resting'}</Text>
              </Pressable>
            ))}
          </View>
          <View style={styles.stats}>
            <Stat label="Outdoor screened" value={duration(summary?.screenedOutdoorSeconds ?? 0)} />
            <Stat label="Unassessed" value={duration(summary?.unassessedSeconds ?? 0)} />
            <Stat label="Indoor" value={duration(summary?.indoorSeconds ?? 0)} />
          </View>
          <Text style={styles.small}>Breaks outdoors remain outdoor exposure. Weather that is missing, stale or from demo mode cannot be scored.</Text>
          <View style={styles.row}>
            <Pressable style={styles.secondary} accessibilityRole="button" onPress={() => void refreshWeather()}>
              <Text style={styles.secondaryLabel}>Refresh weather</Text>
            </Pressable>
            <Pressable style={styles.stop} accessibilityRole="button" onPress={() => void end()}>
              <Text style={styles.stopLabel}>End shift</Text>
            </Pressable>
          </View>
        </>
      )}
    </View>
  );
}

export function Stat({ label, value }: { label: string; value: string }) {
  return <View style={styles.stat}><Text style={styles.statLabel}>{label}</Text><Text style={styles.statValue}>{value}</Text></View>;
}

const styles = StyleSheet.create({
  panel: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 18, padding: 17, gap: 13 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
  title: { fontSize: 18, fontWeight: '800', color: colors.ink },
  status: { color: colors.brand, fontSize: 11, fontWeight: '800' },
  note: { fontSize: 12, color: colors.muted, lineHeight: 19 },
  small: { fontSize: 12, color: colors.muted, lineHeight: 19 },
  error: { color: '#B91C1C', fontSize: 13 },
  label: { fontSize: 13, fontWeight: '700', color: colors.ink, marginTop: 4 },
  row: { flexDirection: 'row', gap: 9, flexWrap: 'wrap' },
  choice: { borderColor: colors.border, borderWidth: 1, borderRadius: 10, minHeight: 44, justifyContent: 'center', alignItems: 'center', flexGrow: 1, paddingHorizontal: 9 },
  selected: { backgroundColor: colors.brand, borderColor: colors.brand },
  choiceLabel: { color: colors.ink, fontWeight: '700', fontSize: 12 },
  selectedLabel: { color: '#fff' },
  primary: { backgroundColor: colors.brand, minHeight: 49, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  primaryLabel: { color: '#fff', fontWeight: '800', fontSize: 15 },
  secondary: { borderRadius: 12, borderWidth: 1, borderColor: colors.border, paddingVertical: 13, flexGrow: 1, alignItems: 'center' },
  secondaryLabel: { color: colors.brand, fontWeight: '700' },
  stop: { borderRadius: 12, backgroundColor: '#FEE2E2', paddingVertical: 13, flexGrow: 1, alignItems: 'center' },
  stopLabel: { color: '#991B1B', fontWeight: '800' },
  disabled: { opacity: 0.5 },
  stats: { flexDirection: 'row', gap: 8 },
  stat: { flex: 1, backgroundColor: colors.background, borderRadius: 10, padding: 9, gap: 4 },
  statLabel: { fontSize: 11, color: colors.muted },
  statValue: { fontSize: 15, fontWeight: '800', color: colors.ink },
});
