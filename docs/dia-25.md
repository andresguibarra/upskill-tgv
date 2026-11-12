# Día 25: workflow asistido por IA (repaso)

El bloque 8 fue la herramienta. Este bloque es el **proceso**: cómo encadenar contexto, plan, implementación y verificación para que el agente no dependa de que te acuerdes de pedir cada cosa. El repo suma tres piezas que se pueden usar desde hoy. Conviene mirar primero [`scripts/check.sh`](../scripts/check.sh) y después [`.github/hooks/`](../.github/hooks/).

## El ciclo

```
contexto ─► plan ─► implementación en pasos chicos ─► verificación ─► review ─► PR
(instructions)  (Plan)   (Agent, un objetivo por sesión)   (check.sh, hooks)  (Reviewer, vos)
```

| Etapa | Qué la hace confiable |
| --- | --- |
| Contexto | instrucciones cortas y ciertas: comandos, convenciones, qué no tocar |
| Plan | revisarlo antes de implementar; es lo más barato de corregir |
| Implementación | un objetivo por sesión, con criterio de "listo" verificable |
| Verificación | algo que corre solo, no un "acordate de correr los tests" |
| Review | diff chico, leído por una persona, con el resultado de los checks a la vista |

## Regla vs. garantía

| Mecanismo | Qué es | Ejemplo en el repo |
| --- | --- | --- |
| Instructions | un pedido al modelo, que puede ignorarlo | "corré los checks antes de terminar" |
| Skill / prompt file | un procedimiento que el agente carga cuando aplica | [`verificar-cambios`](../.github/skills/verificar-cambios/SKILL.md), `/tests-endpoint` |
| **Hook** | **código que corre siempre**, en un punto fijo del ciclo | [`guardrails.json`](../.github/hooks/guardrails.json) |
| CI | la última red, cuando ya hay PR | `.github/workflows/` |

Lo que no puede fallar (no hacer force push, no terminar con tests rojos) va en un hook. Lo que es criterio va en instrucciones.

## Un solo comando de verificación

```bash
scripts/check.sh            # = changed: solo las áreas que tocaste respecto de origin/main
scripts/check.sh backend    # dotnet build -warnaserror + dotnet test
scripts/check.sh all        # frontend, backend, pipelines y hooks
```

Un comando corto que hace lo mismo que el CI es el mejor contexto que se le puede dar a un agente. Las instrucciones, la skill y el hook de abajo usan este mismo script.

## Hooks: guardrails y verificación al terminar

```json
// .github/hooks/guardrails.json (Copilot CLI, agente de la nube y VS Code con el harness Copilot)
{
  "version": 1,
  "hooks": {
    "preToolUse": [{ "type": "command", "bash": "node .github/hooks/guard.cjs", "timeoutSec": 10 }],
    "agentStop":  [{ "type": "command", "bash": "node .github/hooks/verify-on-stop.cjs", "timeoutSec": 600 }]
  }
}
```

```js
// guard.cjs: el evento llega por stdin; se responde JSON por stdout
if (/git\s+push\b.*(--force\b|-f\b)/.test(args))
  return { permissionDecision: 'deny', permissionDecisionReason: 'force push: reescribe historia remota' };
return {};                                  // sin decisión: sigue el flujo normal de permisos

// verify-on-stop.cjs: si fallan los checks, el agente no puede cerrar el turno
if (event.stop_hook_active) return {};      // ya lo forzamos una vez: no entrar en loop
if (run().status !== 0) return { decision: 'block', reason: 'Los checks fallaron: ...' };
```

`preToolUse` puede negar una acción antes de que pase. `agentStop` con `block` le devuelve el turno al agente, con `reason` como prompt. Hay que saber dos detalles: un `preToolUse` que crashea **niega** la acción (fail-closed), pero uno que se pasa del timeout **la deja pasar** (fail-open). Los dos scripts tienen tests en [`hooks.test.cjs`](../.github/hooks/hooks.test.cjs) y corren en CI.

## Skill: el procedimiento empaquetado

```markdown
<!-- .github/skills/verificar-cambios/SKILL.md → se carga sola o con /verificar-cambios -->
---
name: verificar-cambios
description: Verifica un cambio en upskill-tgv antes de darlo por terminado o abrir un PR...
---
1. Corré `scripts/check.sh changed` desde la raíz del repo.
2. Si algo falla, arreglá la causa. No cambies un test para que pase.
3. Reportá qué corriste y el resultado. Si un área no se pudo verificar, decilo.
```

El agente elige la skill por la `description`, así que tiene que decir **cuándo** usarla, no solo qué hace. `name` tiene que coincidir con la carpeta.

## TDD con el agente

```text
1. [vos]   Escribí el test que falla (o pedíselo y revisá que pruebe lo que querés).
2. [Agent] "Hacé pasar este test sin tocarlo. Nada más que eso."
3. [vos]   Refactor con los tests en verde.
```

El test es la especificación que el agente no puede reinterpretar. Los errores típicos: saltear el rojo, implementar de más y testear detalles de implementación.

## Dos tareas en paralelo

```bash
git worktree add ../upskill-ordenar -b dia-25-ordenar origin/main
git worktree add ../upskill-notas   -b dia-25-notas   origin/main
# una sesión de agente por carpeta; al final, merge y scripts/check.sh all
git worktree remove ../upskill-ordenar
```

Con worktrees, cada agente tiene su propia carpeta y rama, y no se pisan archivos. VS Code lo ofrece como **New Worktree** al crear la sesión. Integrar puede dar conflictos igual: por eso se vuelve a verificar al final.

## Permisos y contexto

- **Permission level** por sesión: *Manual* (default), *Assisted* (un LLM aprueba lo que considera seguro) o *Allow all*. Con *Allow all*, los hooks son lo único que frena una acción.
- **Una sesión por tarea.** `/compact` cuando la conversación se alarga y `/fork` para probar una alternativa sin perder el hilo.
- **Contexto chico y cierto** vale más que mucho contexto: un `copilot-instructions.md` con algo desactualizado empeora el resultado.

## Docs oficiales

- [Best practices para agentes](https://code.visualstudio.com/docs/agents/best-practices)
- [Context engineering](https://code.visualstudio.com/docs/agents/guides/context-engineering-guide)
- [Hooks en VS Code](https://code.visualstudio.com/docs/agent-customization/hooks) y [referencia de hooks de GitHub Copilot](https://docs.github.com/copilot/reference/hooks-reference)
- [Agent skills](https://code.visualstudio.com/docs/agent-customization/agent-skills)
- [TDD con agentes](https://code.visualstudio.com/docs/agents/guides/test-driven-development-guide)
- [Dos tareas en worktrees](https://code.visualstudio.com/docs/agents/guides/delegate-two-tasks)
- [Approvals y permission levels](https://code.visualstudio.com/docs/agents/run/approvals)
- [git worktree](https://git-scm.com/docs/git-worktree)
