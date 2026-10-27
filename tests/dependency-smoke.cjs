const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawn } = require('node:child_process');
const clone = require('../src/lib/deepClone');
test('layout cloning preserves nested values without sharing mutable objects', () => {
  const layout = { feeds: [{ id: 'test-feed', options: { muted: true } }], empty: null };
  const copy = clone(layout);
  assert.deepEqual(copy, layout);
  copy.feeds[0].options.muted = false;
  assert.equal(layout.feeds[0].options.muted, true);
});
test('production server serves the built SPA and security middleware works', { timeout: 30000 }, async () => {
  const server = spawn(process.execPath, ['functions/server.js'], {
    env: { ...process.env, SERVER_PORT: '31879', NODE_ENV: 'production' }, stdio: 'inherit'
  });
  try {
    let response;
    for (let i = 0; i < 100; i++) {
      try { response = await fetch('http://127.0.0.1:31879/', { signal: AbortSignal.timeout(1000) }); break; }
      catch { await new Promise(resolve => setTimeout(resolve, 100)); }
    }
    assert.ok(response, 'server must start');
    assert.equal(response.status, 200);
    assert.match(response.headers.get('content-type'), /text\/html/);
    assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
    assert.match(await response.text(), /<div id="app"/);
    const fallback = await fetch('http://127.0.0.1:31879/a-test-route', { headers: { accept: 'text/html' } });
    assert.equal(fallback.status, 200);
  } finally { server.kill(); }
});
