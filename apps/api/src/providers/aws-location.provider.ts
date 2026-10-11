import { GeoPlacesClient, SearchTextCommand } from "@aws-sdk/client-geo-places";
import {
  GeoRoutesClient,
  CalculateRoutesCommand,
} from "@aws-sdk/client-geo-routes";
import type { Coordinates, PlaceResult, RouteOption } from "@heatshield/shared";
import {
  LocationProviderError,
  RouteUnavailableError,
  type LocationProvider,
} from "../services/location.port";

/** Convert AWS [lng,lat] to HeatShield {lat,lng}; reject incomplete provider records. */
function readPosition(position: number[] | undefined): Coordinates | null {
  if (!position || position.length !== 2) return null;
  const [lng, lat] = position;
  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lng) ||
    Math.abs(lat) > 90 ||
    Math.abs(lng) > 180
  )
    return null;
  return { lat, lng };
}

export function mapPlaceItems(
  items: Array<{
    PlaceId?: string;
    Title?: string;
    Address?: { Label?: string };
    Position?: number[];
  }> = [],
): PlaceResult[] {
  return items.flatMap((item) => {
    const point = readPosition(item.Position);
    if (!point || !item.PlaceId || !item.Title) return [];
    return [
      {
        placeId: item.PlaceId,
        name: item.Title,
        address: item.Address?.Label ?? item.Title,
        location: point,
      },
    ];
  });
}

type AwsRouteShape = {
  Summary?: { Distance?: number; Duration?: number };
  Legs?: Array<{ Geometry?: { LineString?: number[][] } }>;
};

export function mapRouteItems(items: AwsRouteShape[] = []): RouteOption[] {
  const routes = items.flatMap((item) => {
    const distance = item.Summary?.Distance;
    const duration = item.Summary?.Duration;
    if (
      typeof distance !== "number" ||
      typeof duration !== "number" ||
      !Number.isFinite(distance) ||
      !Number.isFinite(duration) ||
      distance < 0 ||
      duration < 0
    )
      return [];
    const geometry: [number, number][] = [];
    for (const leg of item.Legs ?? []) {
      for (const pair of leg.Geometry?.LineString ?? []) {
        if (!readPosition(pair)) continue;
        const [lng, lat] = pair;
        const prev = geometry.at(-1);
        if (!prev || prev[0] !== lng || prev[1] !== lat)
          geometry.push([lng, lat]);
      }
    }
    if (geometry.length < 2) return [];
    return [
      {
        routeId: "",
        type: "ALTERNATIVE" as const,
        distanceMeters: distance,
        durationSeconds: duration,
        geometry: { type: "LineString" as const, coordinates: geometry },
        exposure: null,
      },
    ];
  });
  // Do not assume the first provider result is fastest or invent a 'safest' route.
  routes.sort(
    (a, b) =>
      a.durationSeconds - b.durationSeconds ||
      a.distanceMeters - b.distanceMeters,
  );
  return routes.map((route, index) => ({
    ...route,
    routeId: `route_${index + 1}`,
    type: index === 0 ? "FASTEST" : "ALTERNATIVE",
  }));
}

/** Only adapter knows AWS SDK, IAM credentials, region, and response shapes. */
export class AwsLocationProvider implements LocationProvider {
  constructor(
    private readonly places = new GeoPlacesClient({
      region: process.env.AWS_REGION || "ap-south-1",
    }),
    private readonly routes = new GeoRoutesClient({
      region: process.env.AWS_REGION || "ap-south-1",
    }),
  ) {}

  async searchPlaces(
    query: string,
    near: Coordinates | undefined,
    limit: number,
  ): Promise<PlaceResult[]> {
    try {
      const response = await this.places.send(
        new SearchTextCommand({
          QueryText: query,
          MaxResults: limit,
          TravelMode: "Scooter",
          IntendedUse: "SingleUse",
          ...(near ? { BiasPosition: [near.lng, near.lat] } : {}),
        }),
      );
      return mapPlaceItems(response.ResultItems ?? []);
    } catch {
      throw new LocationProviderError(
        "Place search is temporarily unavailable.",
      );
    }
  }

  async calculateRoutes(
    origin: Coordinates,
    destination: Coordinates,
    departureAt?: string,
  ): Promise<RouteOption[]> {
    let response;
    try {
      response = await this.routes.send(
        new CalculateRoutesCommand({
          Origin: [origin.lng, origin.lat],
          Destination: [destination.lng, destination.lat],
          TravelMode: "Scooter",
          MaxAlternatives: 2,
          LegGeometryFormat: "Simple",
          ...(departureAt
            ? { DepartureTime: new Date(departureAt).toISOString() }
            : {}),
        }),
      );
    } catch (cause) {
      if (
        cause &&
        typeof cause === "object" &&
        "name" in cause &&
        (cause.name === "ValidationException" ||
          cause.name === "NoRouteFoundException")
      ) {
        throw new RouteUnavailableError(
          "No scooter route is available for these points.",
        );
      }
      throw new LocationProviderError(
        "Route provider is temporarily unavailable.",
      );
    }
    const routes = mapRouteItems(response.Routes ?? []);
    if (routes.length === 0)
      throw new RouteUnavailableError(
        "No scooter route is available for these points.",
      );
    return routes;
  }
}
