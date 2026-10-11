import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import * as Location from 'expo-location';
import type { Coordinates, ScreenedWeatherData } from '@heatshield/shared';
import { InfoCard } from '@/components/info-card';
import { ScreenShell } from '@/components/screen-shell';
import { fetchCurrentWeather } from '@/services/weather-api';
import { colors } from '@/theme/colors';

const PUNE_DEMO_LOCATION: Coordinates = { lat: 18.5204, lng: 73.8567 };

type Stage = 'idle' | 'locating' | 'loading' | 'ready' | 'error';

function weatherValue(value: number | null, unit = ''): string {
  return value === null ? 'Unavailable' : `${Math.round(value * 10) / 10}${unit}`;
}

export default function HomeScreen() {
  const [stage, setStage] = useState<Stage>('idle');
  const [conditions, setConditions] = useState<ScreenedWeatherData | null>(null);
  const [locationLabel, setLocationLabel] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastCoordinates, setLastCoordinates] = useState<Coordinates | null>(null);

  async function loadWeather(coordinates: Coordinates, label: string) {
    setStage('loading');
    setErrorMessage(null);
    setConditions(null);
    setLocationLabel(label);
    setLastCoordinates(coordinates);
    try {
      const result = await fetchCurrentWeather(coordinates);
      setConditions(result);
      setStage('ready');
    } catch (error) {
      setStage('error');
      setErrorMessage(error instanceof Error ? error.message : 'Unable to load weather.');
    }
  }

  async function useMyLocation() {
    setStage('locating');
    setErrorMessage(null);
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (!permission.granted) {
        setStage('error');
        setErrorMessage('Location permission is off. Enable it or use the Pune test location.');
        return;
      }
      const result = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      await loadWeather({ lat: result.coords.latitude, lng: result.coords.longitude }, 'Your location');
    } catch {
      setStage('error');
      setErrorMessage('Unable to get your location. Check GPS or use the test location.');
    }
  }

  const busy = stage === 'locating' || stage === 'loading';
  const w = conditions?.weather;

  return (
    <ScreenShell title="Stay safer in the heat" subtitle="Local weather information for riders.">
      <View style={styles.controls}>
        <Pressable
          accessibilityRole="button"
          disabled={busy}
          style={[styles.primaryButton, busy && styles.disabled]}
          onPress={useMyLocation}
        >
          <Text style={styles.primaryText}>Use my location</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          disabled={busy}
          style={[styles.secondaryButton, busy && styles.disabled]}
          onPress={() => loadWeather(PUNE_DEMO_LOCATION, 'Pune - test location')}
        >
          <Text style={styles.secondaryText}>Try Pune</Text>
        </Pressable>
      </View>

      {busy && (
        <View style={styles.notice}>
          <ActivityIndicator color={colors.brand} />
          <Text style={styles.noticeText}>{stage === 'locating' ? 'Finding your location...' : 'Getting current weather...'}</Text>
        </View>
      )}

      {stage === 'error' && (
        <View style={styles.errorBox}>
          <Text style={styles.errorHeading}>Weather unavailable</Text>
          <Text style={styles.errorText}>{errorMessage}</Text>
          {lastCoordinates && (
            <Pressable accessibilityRole="button" onPress={() => loadWeather(lastCoordinates, locationLabel)}>
              <Text style={styles.retry}>Retry</Text>
            </Pressable>
          )}
        </View>
      )}

      {w && conditions && (
        <View style={styles.weatherCard}>
          <Text style={styles.eyebrow}>{locationLabel.toUpperCase()}</Text>
          <Text style={styles.temperature}>{weatherValue(w.temperatureC, '°C')}</Text>
          <Text style={styles.feelsLike}>Feels like {weatherValue(w.apparentTemperatureC, '°C')}</Text>
          <View style={styles.grid}>
            <View style={styles.metric}><Text style={styles.metricLabel}>Humidity</Text><Text style={styles.metricValue}>{weatherValue(w.relativeHumidityPct, '%')}</Text></View>
            <View style={styles.metric}><Text style={styles.metricLabel}>UV Index</Text><Text style={styles.metricValue}>{weatherValue(w.uvIndex)}</Text></View>
            <View style={styles.metric}><Text style={styles.metricLabel}>Wind</Text><Text style={styles.metricValue}>{weatherValue(w.windSpeedKph, ' km/h')}</Text></View>
            <View style={styles.metric}><Text style={styles.metricLabel}>Solar radiation</Text><Text style={styles.metricValue}>{weatherValue(w.solarRadiationWm2, ' W/m²')}</Text></View>
          </View>
          <Text style={styles.source}>Open-Meteo model estimate · Valid {new Date(conditions.validAt).toLocaleString()}</Text>
          <View style={styles.screeningCard}>
            <Text style={styles.screeningHeading}>Estimated heat index: {weatherValue(conditions.heatScreening.heatIndexC, '°C')}</Text>
            <Text style={styles.screeningBand}>NWS screening: {conditions.heatScreening.band.replaceAll('_', ' ')}</Text>
            <Text style={styles.screeningText}>{conditions.heatScreening.message}</Text>
            <Text style={styles.screeningNote}>{conditions.heatScreening.limitation}</Text>
          </View>
        </View>
      )}

      {stage === 'idle' && (
        <InfoCard
          eyebrow="CURRENT CONDITIONS"
          title="Check your local weather"
          description="Allow foreground location for your current area, or try Pune to test the live weather API."
        />
      )}

      <InfoCard
        eyebrow="YOUR SHIFT"
        title="Shift tracking is coming next"
        description="Current weather does not automatically mean a rider is at risk. Shift tracking and heat exposure scoring are separate upcoming features."
      />
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  controls: { flexDirection: 'row', gap: 10 },
  primaryButton: { backgroundColor: colors.brand, borderRadius: 12, paddingVertical: 13, paddingHorizontal: 14, flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 48 },
  secondaryButton: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 12, paddingVertical: 13, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center', minHeight: 48 },
  primaryText: { color: '#fff', fontSize: 14, fontWeight: '700' },
  secondaryText: { color: colors.brand, fontSize: 14, fontWeight: '700' },
  disabled: { opacity: 0.5 },
  notice: { flexDirection: 'row', gap: 12, alignItems: 'center', padding: 16 },
  noticeText: { color: colors.muted, fontSize: 14 },
  errorBox: { backgroundColor: '#FEF2F2', borderRadius: 16, padding: 16, gap: 8, borderWidth: 1, borderColor: '#FECACA' },
  errorHeading: { fontSize: 16, color: '#991B1B', fontWeight: '800' },
  errorText: { color: '#991B1B', lineHeight: 20 },
  retry: { color: colors.brand, fontWeight: '800', marginTop: 8 },
  weatherCard: { backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: 18, padding: 20, gap: 10 },
  eyebrow: { fontSize: 12, fontWeight: '800', color: colors.brand, letterSpacing: 1 },
  temperature: { fontSize: 56, fontWeight: '800', color: colors.ink, lineHeight: 64 },
  feelsLike: { fontSize: 16, color: colors.muted },
  grid: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 12, gap: 10 },
  metric: { backgroundColor: colors.background, borderRadius: 12, padding: 12, width: '48%' },
  metricLabel: { fontSize: 12, color: colors.muted },
  metricValue: { marginTop: 5, fontWeight: '800', color: colors.ink, fontSize: 16 },
  source: { marginTop: 4, fontSize: 11, color: colors.muted, lineHeight: 16 },
  screeningCard: { padding: 14, marginTop: 8, borderRadius: 12, backgroundColor: colors.background, gap: 7 },
  screeningHeading: { fontSize: 19, fontWeight: '800', color: colors.ink },
  screeningBand: { fontSize: 13, fontWeight: '700', color: colors.brand },
  screeningText: { fontSize: 13, color: colors.ink, lineHeight: 19 },
  screeningNote: { fontSize: 11, color: colors.muted, lineHeight: 17 },
});
