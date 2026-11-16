// agentStop: antes de que el agente dé el turno por terminado, corre scripts/check.sh changed.
// Si falla, devuelve "block" y el agente sigue con el error como prompt. Una sola vez por turno.
const { spawnSync } = require('node:child_process');
const path = require('node:path');

function decide(event, run = runChecks) {
  if (event.stop_hook_active) return {};   // ya se le pidió arreglarlo una vez: no entrar en loop
  const { status, output } = run();
  if (status === 0) return {};
  return {
    decision: 'block',
    reason: `Los checks del repo fallaron. Arreglalo antes de terminar (no cambies los tests para que pasen):\n${output.slice(-3000)}`,
  };
}

function runChecks() {
  const root = path.resolve(__dirname, '../..');
  const r = spawnSync('bash', ['scripts/check.sh', 'changed'], { cwd: root, encoding: 'utf8' });
  return { status: r.status, output: `${r.stdout ?? ''}${r.stderr ?? ''}` };
}

module.exports = { decide };

if (require.main === module) {
  const event = JSON.parse(require('node:fs').readFileSync(0, 'utf8') || '{}');
  process.stdout.write(JSON.stringify(decide(event)));
}
