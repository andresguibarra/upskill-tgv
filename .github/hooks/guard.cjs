// preToolUse: bloquea comandos de terminal destructivos antes de que el agente los corra.
// Recibe el evento por stdin y responde JSON por stdout ({} = sin decisión, sigue el flujo normal de permisos).
const BLOCKED = [
  [/git\s+push\b.*(--force\b|-f\b)/, 'force push: reescribe historia remota'],
  [/git\s+reset\s+--hard/, 'git reset --hard: descarta cambios sin commitear'],
  [/rm\s+-[a-z]*r[a-z]*\s+(\/|~|\.\.?)(?=[\s"'}]|$)/, 'rm -r sobre /, ~, . o ..'],
  [/dotnet\s+ef\s+database\s+drop/, 'borra la base de datos'],
];

function decide(event) {
  const args = typeof event.toolArgs === 'string' ? event.toolArgs : JSON.stringify(event.toolArgs ?? '');
  for (const [pattern, why] of BLOCKED) {
    if (pattern.test(args)) {
      return { permissionDecision: 'deny', permissionDecisionReason: `Bloqueado por .github/hooks/guard.cjs: ${why}. Pedile a una persona que lo corra.` };
    }
  }
  return {};
}

module.exports = { decide };

if (require.main === module) {
  const event = JSON.parse(require('node:fs').readFileSync(0, 'utf8') || '{}');
  process.stdout.write(JSON.stringify(decide(event)));
}
