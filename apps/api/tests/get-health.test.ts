import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { handler } from '../src/handlers/health/get-health';

test('health handler responds successfully without external services', async () => {
  // The handler deliberately uses only context.awsRequestId.
  const result = await handler({} as never, { awsRequestId: 'req-test' } as never);
  assert.ok(result && typeof result === 'object' && 'statusCode' in result);
  assert.equal(result.statusCode, 200);
  const body = JSON.parse(String(result.body));
  assert.equal(body.success, true);
  assert.equal(body.data.status, 'ok');
  assert.equal(body.meta.requestId, 'req-test');
});
