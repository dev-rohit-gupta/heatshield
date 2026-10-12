import { StyleSheet, Text, View } from 'react-native';
import { summarizeShift } from '@heatshield/heat-engine';
import { InfoCard } from '@/components/info-card';
import { ScreenShell } from '@/components/screen-shell';
import { useShift } from '@/features/shifts/shift-provider';
import { colors } from '@/theme/colors';

function minutes(seconds: number): string { return `${Math.floor(seconds / 60)} min`; }

export default function ActivityScreen() {
  const { data, ready } = useShift();
  const items = data.active ? [data.active, ...data.history] : data.history;
  return (
    <ScreenShell title="Your shift history" subtitle="Your work time, recorded on this device.">
      {!ready && <Text style={styles.muted}>Loading saved shifts...</Text>}
      {ready && items.length === 0 && <InfoCard eyebrow="HISTORY" title="No shifts yet" description="Start a shift from Home. Work time is assessed only while the app is open and has recent real weather." />}
      {items.map(shift => {
        const totals = summarizeShift(shift);
        return (
          <View style={styles.card} key={shift.id}>
            <View style={styles.row}>
              <Text style={styles.title}>{new Date(shift.startedAt).toLocaleDateString()}</Text>
              <Text style={styles.status}>{shift.status}</Text>
            </View>
            <Text style={styles.muted}>Started {new Date(shift.startedAt).toLocaleTimeString()}</Text>
            <View style={styles.row}><Text>Screened outdoor time</Text><Text style={styles.value}>{minutes(totals.screenedOutdoorSeconds)}</Text></View>
            <View style={styles.row}><Text>Unassessed time</Text><Text style={styles.value}>{minutes(totals.unassessedSeconds)}</Text></View>
            <View style={styles.row}><Text>Indoor time</Text><Text style={styles.value}>{minutes(totals.indoorSeconds)}</Text></View>
            <View style={styles.row}><Text>NWS danger-band time</Text><Text style={styles.value}>{minutes(totals.byBandSeconds.DANGER + totals.byBandSeconds.EXTREME_DANGER)}</Text></View>
          </View>
        );
      })}
      <Text style={styles.muted}>Weather-based NWS screening is not a medical risk score. No raw GPS locations are saved in this history.</Text>
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  card: { padding: 17, backgroundColor: colors.surface, borderRadius: 16, borderWidth: 1, borderColor: colors.border, gap: 11 },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 10 },
  title: { fontSize: 17, fontWeight: '800', color: colors.ink },
  status: { fontSize: 12, color: colors.brand, fontWeight: '700' },
  value: { fontSize: 13, color: colors.ink, fontWeight: '700' },
  muted: { fontSize: 12, color: colors.muted, lineHeight: 18 },
});
