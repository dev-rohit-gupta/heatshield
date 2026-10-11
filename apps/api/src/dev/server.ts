import { createServer } from 'node:http';
import { randomUUID } from 'node:crypto';
import { handleCurrentWeather } from '../handlers/weather/get-current-weather';

const port = Number(process.env.PORT || 3001);
const host = process.env.HOST || '0.0.0.0';

// LOCAL DEVELOPMENT ONLY: not an AWS deployment or production HTTP server.
const server = createServer(async (request, response) => {
  const url = new URL(request.url || '/', `http://${request.headers.host || 'localhost'}`);
  const meta = { requestId: randomUUID(), timestamp: new Date().toISOString() };

  if (request.method === 'GET' && url.pathname === '/v1/health') {
    response.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    response.end(JSON.stringify({ success: true, data: { status: 'ok', version: '0.1.0' }, meta }));
    return;
  }

  if (request.method === 'GET' && url.pathname === '/v1/weather/current') {
    const result = await handleCurrentWeather(
      Object.fromEntries(url.searchParams.entries()),
      meta.requestId,
    );
    response.writeHead(result.statusCode, result.headers);
    response.end(result.body);
    return;
  }

  response.writeHead(404, { 'Content-Type': 'application/json' });
  response.end(JSON.stringify({
    success: false,
    error: { code: 'RESOURCE_NOT_FOUND', message: 'Route not found.', retryable: false },
    meta,
  }));
});

server.listen(port, host, () => {
  console.log(`HeatShield local API: http://localhost:${port}/v1`);
  console.log('Development server only. Do not expose directly to the public internet.');
});
