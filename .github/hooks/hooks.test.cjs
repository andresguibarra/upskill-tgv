const test = require('node:test');
const assert = require('node:assert');
const guard = require('./guard.cjs');
const stop = require('./verify-on-stop.cjs');

test('guard bloquea comandos destructivos', () => {
  for (const command of ['git push --force origin main', 'git push -f', 'git reset --hard HEAD~1', 'rm -rf /', 'rm -rf ~', 'dotnet ef database drop -f']) {
    assert.equal(guard.decide({ toolName: 'bash', toolArgs: { command } }).permissionDecision, 'deny', command);
  }
});

test('guard deja pasar lo normal (y toolArgs como string)', () => {
  for (const command of ['git push -u origin dia-25', 'rm -rf frontend/dist', 'dotnet test', 'git reset --soft HEAD~1']) {
    assert.deepEqual(guard.decide({ toolName: 'bash', toolArgs: JSON.stringify({ command }) }), {}, command);
  }
});

test('verify-on-stop bloquea si fallan los checks y no entra en loop', () => {
  const failing = () => ({ status: 1, output: 'error CS1002: ; expected' });
  const result = stop.decide({ stop_hook_active: false }, failing);
  assert.equal(result.decision, 'block');
  assert.match(result.reason, /CS1002/);
  assert.deepEqual(stop.decide({ stop_hook_active: true }, failing), {});
  assert.deepEqual(stop.decide({}, () => ({ status: 0, output: '' })), {});
});
