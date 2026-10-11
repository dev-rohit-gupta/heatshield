import { useEffect, useMemo, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Camera, GeoJSONSource, Layer, Map, Marker, type CameraRef } from '@maplibre/maplibre-react-native';
import type { Coordinates, RouteOption } from '@heatshield/shared';
import { colors } from '@/theme/colors';
import { computeRouteBounds, selectMapStyleUrl, splitRouteCollections } from './route-map-data';

type RouteMapProps = {
  origin: Coordinates;
  destination: Coordinates;
  routes: RouteOption[];
  selectedRouteId: string | null;
};

const MAP_PADDING = { top: 34, right: 34, bottom: 34, left: 34 };

/** MapLibre is intentionally isolated here; screens and services only use shared domain types. */
export function RouteMap({ origin, destination, routes, selectedRouteId }: RouteMapProps) {
  const cameraRef = useRef<CameraRef>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapFailed, setMapFailed] = useState(false);
  const mapStyle = selectMapStyleUrl(process.env.EXPO_PUBLIC_MAP_STYLE_URL);
  const bounds = useMemo(
    () => computeRouteBounds(origin, destination, routes),
    [origin, destination, routes],
  );
  const collections = useMemo(
    () => splitRouteCollections(routes, selectedRouteId),
    [routes, selectedRouteId],
  );

  const viewKey = bounds.join(',');
  useEffect(() => {
    if (!mapLoaded) return;
    cameraRef.current?.fitBounds(bounds, { duration: 350, padding: MAP_PADDING });
    // Refit when the destination/route geometry changes, not on card selection.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewKey, mapLoaded]);

  return (
    <View style={styles.frame}>
      <Map
        style={styles.map}
        mapStyle={mapStyle}
        androidView="texture"
        logo
        attribution
        onDidFinishLoadingMap={() => { setMapFailed(false); setMapLoaded(true); }}
        onDidFailLoadingMap={() => { setMapFailed(true); setMapLoaded(false); }}
      >
        <Camera ref={cameraRef} initialViewState={{ bounds, padding: MAP_PADDING }} />
        <GeoJSONSource id="heatshield-alternatives" data={collections.alternatives}>
          <Layer id="heatshield-alternatives-line" type="line" paint={{ 'line-color': '#64748B', 'line-width': 4, 'line-opacity': 0.85 }} layout={{ 'line-cap': 'round', 'line-join': 'round' }} />
        </GeoJSONSource>
        <GeoJSONSource id="heatshield-selected" data={collections.selected}>
          <Layer id="heatshield-selected-outline" type="line" paint={{ 'line-color': '#FFFFFF', 'line-width': 9, 'line-opacity': 0.95 }} layout={{ 'line-cap': 'round', 'line-join': 'round' }} />
          <Layer id="heatshield-selected-line" type="line" paint={{ 'line-color': colors.brand, 'line-width': 6 }} layout={{ 'line-cap': 'round', 'line-join': 'round' }} />
        </GeoJSONSource>
        <Marker id="route-start" lngLat={[origin.lng, origin.lat]}>
          <View style={[styles.marker, styles.originMarker]}><View style={styles.markerCenter} /></View>
        </Marker>
        <Marker id="route-end" lngLat={[destination.lng, destination.lat]}>
          <View style={[styles.marker, styles.destinationMarker]}><View style={styles.markerCenter} /></View>
        </Marker>
      </Map>
      {mapFailed && (
        <View pointerEvents="none" style={styles.errorBanner}>
          <Text style={styles.errorText}>Map tiles could not load. Check connectivity or map style URL.</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: { height: 270, borderRadius: 16, overflow: 'hidden', borderWidth: 1, borderColor: colors.border, backgroundColor: '#E7EEF1' },
  map: { flex: 1 },
  marker: { width: 23, height: 23, borderRadius: 12, borderWidth: 3, borderColor: '#FFFFFF', alignItems: 'center', justifyContent: 'center', elevation: 3 },
  originMarker: { backgroundColor: colors.brand },
  destinationMarker: { backgroundColor: '#EA580C' },
  markerCenter: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#FFFFFF' },
  errorBanner: { position: 'absolute', top: 10, left: 10, right: 10, borderRadius: 8, backgroundColor: '#FFF0F0', padding: 9 },
  errorText: { color: '#991B1B', fontSize: 12, lineHeight: 16 },
});
