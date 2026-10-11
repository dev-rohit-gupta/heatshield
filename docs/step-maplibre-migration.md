# HeatShield: Map rendering boundary

`RouteMap` is the only component importing `@maplibre/maplibre-react-native`. All screen and API code remains based on `Coordinates`, `RouteOption`, and `RoutePlanData` from `@heatshield/shared`.

- MapLibre: renders streets, routes and endpoint markers; it does **not** calculate directions.
- OpenFreeMap: provides the default vector tile/style data; it does **not** provide navigation, geocoding or routing.
- Demo location provider: sample route geometry only, explicitly not road navigation.
- AWS location provider: kept behind the existing `LocationProvider` port; remains blocked until AWS access returns.
- Heat engine: calculates environmental exposure time; independent of maps.

Test route coordinate conversion separately. Domain coordinates are `{lat,lng}`. GeoJSON and MapLibre take `[lng,lat]`.

OpenFreeMap attribution must remain visible. A real rider navigation feature must not use the synthetic demo routes.
