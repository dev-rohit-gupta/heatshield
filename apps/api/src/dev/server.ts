import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { handleCurrentWeather } from '../handlers/weather/get-current-weather';
import { handleSearchPlaces } from '../handlers/places/search-places';
import { handlePlanRoute } from '../handlers/routes/plan-route';
import { errorResult } from '../lib/http-response';
import { DemoLocationProvider } from '../providers/demo-location.provider';
import { LocationService } from '../services/location.service';
import { WeatherRouteExposureAnalyzer } from '../services/route-exposure.service';
import { getCurrentWeather } from '../services/weather.service';
import { getDemoWeather } from '../services/demo-weather.service';

const port = Number(process.env.PORT || 3001);
const host = process.env.HOST || '0.0.0.0';
// Demo mode exists ONLY in this local dev adapter. Production handlers always use AWS.
const demoService = process.env.LOCATION_PROVIDER === 'demo'
  ? new LocationService(new DemoLocationProvider(), new WeatherRouteExposureAnalyzer(
    process.env.DEMO_WEATHER === '1' ? getDemoWeather : getCurrentWeather,
  ))
  : undefined;

// Local-only development adapter. Production APIs use API Gateway + individual Lambda handlers.
const server = createServer(async (request, response) => {
  const url = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`);
  const id = randomUUID();
  const send = (result: { statusCode: number; headers: Record<string, string>; body: string }) => {
    response.writeHead(result.statusCode, result.headers);
    response.end(result.body);
  };

  if (request.method === 'GET' && url.pathname === '/v1/health') {
    const meta = { requestId: id, timestamp: new Date().toISOString() };
    send({ statusCode: 200, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }, body: JSON.stringify({ success: true, data: { status: 'ok', version: '0.1.0' }, meta }) });
    return;
  }
  if (request.method === 'GET' && url.pathname === '/v1/weather/current') {
    send(await handleCurrentWeather(Object.fromEntries(url.searchParams), id));
    return;
  }
  if (request.method === 'GET' && url.pathname === '/v1/places/search') {
    send(await handleSearchPlaces(Object.fromEntries(url.searchParams), id, demoService));
    return;
  }
  if (request.method === 'POST' && url.pathname === '/v1/routes/plan') {
    if (!(request.headers['content-type'] || '').toLowerCase().startsWith('application/json')) {
      send(errorResult(415, 'UNSUPPORTED_MEDIA_TYPE', 'Use application/json.', false, id));
      return;
    }
    let raw = '';
    for await (const chunk of request) {
      raw += chunk.toString();
      if (raw.length > 12_000) {
        send(errorResult(413, 'REQUEST_TOO_LARGE', 'Body must be smaller than 12 KB.', false, id));
        return;
      }
    }
    let input: unknown;
    try { input = JSON.parse(raw); }
    catch {
      send(errorResult(400, 'INVALID_REQUEST', 'Invalid JSON request body.', false, id));
      return;
    }
    send(await handlePlanRoute(input, id, demoService));
    return;
  }
  send(errorResult(404, 'RESOURCE_NOT_FOUND', 'Route not found.', false, id));
});

server.listen(port, host, () => {
  console.log(`HeatShield local API: http://localhost:${port}/v1`);
  console.log(demoService
    ? `DEMO routing active - illustrative geometry only. Weather: ${process.env.DEMO_WEATHER === '1' ? 'DEMO SAMPLE' : 'Open-Meteo model'}`
    : 'AWS routing active - AWS credentials required.');
});
