const { readFileSync } = require('node:fs');
const { runInNewContext } = require('node:vm');
const assert = require('node:assert/strict');
for (const host of ['short-drama-demo-sigma.vercel.app', 'localhost']) {
  const context = { window: {}, location: { hostname: host } };
  runInNewContext(readFileSync('mujian-config.js', 'utf8'), context);
  const config = context.window.mujianConfig;
  assert.equal(config.apiBaseUrl, host === 'localhost' ? 'http://localhost:3001' : 'https://stminiapp-production.up.railway.app');
  assert.equal(config.mijingDelaySeconds, 120);
  assert.equal(JSON.stringify(config.communityWindowsSeconds), '[[30,90],[180,270]]');
  assert.equal(config.sourceId, undefined);
}
console.log('Static release configuration passed');
