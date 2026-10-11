import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import * as Location from 'expo-location';
import type { Coordinates, PlaceResult, RoutePlanData } from '@heatshield/shared';
import { InfoCard } from '@/components/info-card';
import { ScreenShell } from '@/components/screen-shell';
import { RouteMap } from '@/features/routes/route-map';
import { searchPlaces, planScooterRoute } from '@/services/location-api';
import { colors } from '@/theme/colors';

const PUNE_TEST_ORIGIN = { lat: 18.5204, lng: 73.8567 };

export default function RoutesScreen() {
  const [origin, setOrigin] = useState<Coordinates | null>(null);
  const [originLabel, setOriginLabel] = useState('');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<PlaceResult[]>([]);
  const [selectedPlace, setSelectedPlace] = useState<PlaceResult | null>(null);
  const [plan, setPlan] = useState<RoutePlanData | null>(null);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const [searchCompleted, setSearchCompleted] = useState(false);
  const [planning, setPlanning] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState('');
  const pendingPlan = useRef<AbortController | null>(null);

  useEffect(() => () => pendingPlan.current?.abort(), []);

  useEffect(() => {
    setSearchCompleted(false);
    if (!origin || selectedPlace || query.trim().length < 3) {
      setResults([]);
      setSearching(false);
      return;
    }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const response = await searchPlaces(query.trim(), origin, controller.signal);
        if (!controller.signal.aborted) { setResults(response.places); setSearchCompleted(true); }
      } catch (cause) {
        if (!controller.signal.aborted) {
          setResults([]);
          setError(cause instanceof Error ? cause.message : 'Destination search failed.');
        }
      } finally {
        if (!controller.signal.aborted) setSearching(false);
      }
    }, 400);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [query, origin, selectedPlace]);

  async function useCurrentLocation() {
    pendingPlan.current?.abort();
    setLocating(true);
    setError('');
    try {
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== 'granted') {
        setError('Location denied. You can use the Pune test location instead.');
        return;
      }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setOrigin({ lat: loc.coords.latitude, lng: loc.coords.longitude });
      setOriginLabel('Your current location');
      setPlan(null);
      setSelectedPlace(null);
      setResults([]);
    } catch {
      setError('Could not get GPS location. Try again or use the Pune test location.');
    } finally { setLocating(false); }
  }

  function chooseOrigin() {
    pendingPlan.current?.abort();
    setOrigin(PUNE_TEST_ORIGIN);
    setOriginLabel('Pune test location');
    setPlan(null);
    setSelectedPlace(null);
    setResults([]);
    setError('');
    setSearchCompleted(false);
  }

  async function chooseDestination(place: PlaceResult) {
    if (!origin) return;
    pendingPlan.current?.abort();
    const controller = new AbortController();
    pendingPlan.current = controller;
    setSelectedPlace(place);
    setQuery(place.name);
    setResults([]);
    setPlan(null);
    setPlanning(true);
    setError('');
    try {
      const result = await planScooterRoute(origin, place.location, controller.signal);
      if (!controller.signal.aborted) {
        setPlan(result);
        setSelectedRouteId(result.routes[0]?.routeId ?? null);
      }
    } catch (cause) {
      if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'No route could be calculated.');
    } finally {
      if (!controller.signal.aborted) setPlanning(false);
    }
  }

  function updateQuery(value: string) {
    pendingPlan.current?.abort();
    setPlanning(false);
    setQuery(value);
    setSelectedPlace(null);
    setPlan(null);
    setSelectedRouteId(null);
    setError('');
    setSearchCompleted(false);
  }

  return (
    <ScreenShell title="Plan your ride" subtitle="Find routes for your scooter. Heat exposure comparison is coming next.">
      <View style={styles.controlRow}>
        <Pressable style={styles.button} disabled={locating} onPress={useCurrentLocation} accessibilityRole="button">
          <Text style={styles.buttonText}>{locating ? 'Finding...' : 'Use GPS'}</Text>
        </Pressable>
        <Pressable style={styles.outlineButton} onPress={chooseOrigin} accessibilityRole="button">
          <Text style={styles.outlineText}>Try Pune</Text>
        </Pressable>
      </View>
      <Text style={styles.subtle}>{origin ? `Start: ${originLabel}` : 'Choose your starting location.'}</Text>
      <TextInput
        style={styles.input}
        value={query}
        onChangeText={updateQuery}
        placeholder={origin ? 'Search delivery destination' : 'Choose start first'}
        placeholderTextColor={colors.muted}
        editable={Boolean(origin)}
        autoCorrect={false}
        accessibilityLabel="Search destination"
      />
      {searching && <View style={styles.inline}><ActivityIndicator color={colors.brand}/><Text>Searching places...</Text></View>}
      {results.map(place => (
        <Pressable key={place.placeId} style={styles.result} accessibilityRole="button" onPress={() => chooseDestination(place)}>
          <Text style={styles.resultName}>{place.name}</Text>
          <Text style={styles.subtle} numberOfLines={2}>{place.address}</Text>
        </Pressable>
      ))}
      {searchCompleted && !searching && query.trim().length >= 3 && !selectedPlace && results.length === 0 && !error && <Text style={styles.subtle}>No suggestions found.</Text>}
      {planning && <View style={styles.inline}><ActivityIndicator color={colors.brand}/><Text>Finding scooter routes...</Text></View>}
      {!!error && <View style={styles.error}><Text style={styles.errorText}>{error}</Text></View>}
      {plan && selectedPlace && origin && (
        <>
          <RouteMap origin={origin} destination={selectedPlace.location} routes={plan.routes} selectedRouteId={selectedRouteId}/>
          <Text style={styles.heading}>Available routes</Text>
          {plan.routes.map(route => (
            <Pressable
              key={route.routeId}
              style={[styles.routeCard, route.routeId === selectedRouteId && styles.selected]}
              accessibilityRole="button"
              onPress={() => setSelectedRouteId(route.routeId)}
            >
              <Text style={styles.routeTitle}>{route.type === 'FASTEST' ? 'Fastest route' : 'Alternative route'}</Text>
              <Text style={styles.routeMetrics}>{Math.ceil(route.durationSeconds / 60)} min  ·  {(route.distanceMeters / 1000).toFixed(1)} km</Text>
            </Pressable>
          ))}
          <Text style={styles.subtle}>{plan.notice}</Text>
          <Text style={styles.subtle}>Starting a trip will be enabled after shift and trip APIs are implemented.</Text>
        </>
      )}
      {!origin && <InfoCard eyebrow="START HERE" title="Choose a location" description="Use GPS or a labelled Pune test location. Then search a destination to see AWS scooter routes."/>}
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  controlRow: { flexDirection: 'row', gap: 10 },
  button: { flex: 1, minHeight: 48, justifyContent: 'center', alignItems: 'center', padding: 12, borderRadius: 12, backgroundColor: colors.brand },
  buttonText: { color: '#fff', fontWeight: '800' },
  outlineButton: { flex: 1, minHeight: 48, justifyContent: 'center', alignItems: 'center', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  outlineText: { color: colors.brand, fontWeight: '800' },
  subtle: { fontSize: 12, color: colors.muted, lineHeight: 18 },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: 12, backgroundColor: colors.surface, padding: 15, minHeight: 52, color: colors.ink, fontSize: 16 },
  inline: { flexDirection: 'row', gap: 10, alignItems: 'center', paddingVertical: 8 },
  result: { padding: 13, backgroundColor: colors.surface, borderRadius: 10, borderWidth: 1, borderColor: colors.border, gap: 3 },
  resultName: { fontSize: 15, fontWeight: '700', color: colors.ink },
  error: { backgroundColor: '#FEF2F2', padding: 12, borderRadius: 10 },
  errorText: { color: '#991B1B', lineHeight: 20 },
  heading: { fontSize: 17, fontWeight: '800', color: colors.ink },
  routeCard: { padding: 14, backgroundColor: colors.surface, borderRadius: 12, borderWidth: 1, borderColor: colors.border, gap: 4 },
  selected: { borderWidth: 2, borderColor: colors.brand },
  routeTitle: { fontSize: 15, color: colors.ink, fontWeight: '800' },
  routeMetrics: { fontSize: 14, color: colors.muted },
});
