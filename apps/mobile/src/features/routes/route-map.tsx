import { useEffect, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import MapView, { Marker, Polyline } from 'react-native-maps';
import type { RouteOption, Coordinates } from '@heatshield/shared';
import { colors } from '@/theme/colors';

type Props = { origin: Coordinates; destination: Coordinates; routes: RouteOption[]; selectedRouteId: string | null };

/** Only this component knows the map SDK. Rest of the app uses shared geometry types. */
export function RouteMap({ origin, destination, routes, selectedRouteId }: Props) {
  const mapRef = useRef<MapView>(null);
  useEffect(() => {
    const points = routes.flatMap(route => route.geometry.coordinates.map(([lng, lat]) => ({ latitude: lat, longitude: lng })));
    const all = points.length ? points : [origin, destination].map(({ lat, lng }) => ({ latitude: lat, longitude: lng }));
    // fitToCoordinates requires the map to complete its initial layout.
    const timer = setTimeout(() => mapRef.current?.fitToCoordinates(all, { edgePadding: { top: 40, right: 40, bottom: 40, left: 40 }, animated: true }), 300);
    return () => clearTimeout(timer);
  }, [origin.lat, origin.lng, destination.lat, destination.lng, routes]);

  return (
    <View style={styles.frame}>
      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFill}
        initialRegion={{ latitude: origin.lat, longitude: origin.lng, latitudeDelta: 0.055, longitudeDelta: 0.055 }}
        showsUserLocation={false}
      >
        {routes.map(route => (
          <Polyline
            key={route.routeId}
            coordinates={route.geometry.coordinates.map(([lng, lat]) => ({ latitude: lat, longitude: lng }))}
            strokeColor={route.routeId === selectedRouteId ? colors.brand : '#94A3B8'}
            strokeWidth={route.routeId === selectedRouteId ? 6 : 3}
            zIndex={route.routeId === selectedRouteId ? 2 : 1}
          />
        ))}
        <Marker coordinate={{ latitude: origin.lat, longitude: origin.lng }} title="Start" />
        <Marker coordinate={{ latitude: destination.lat, longitude: destination.lng }} title="Destination" />
      </MapView>
    </View>
  );
}

const styles = StyleSheet.create({ frame: { height: 265, borderRadius: 16, overflow: 'hidden', borderColor: colors.border, borderWidth: 1 } });
