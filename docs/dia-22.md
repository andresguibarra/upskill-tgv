# Día 22: GitHub Copilot (repaso)

Ayuda memoria de Copilot en VS Code y en GitHub, al estado de noviembre de 2026. Cambió bastante en el último año: los *chat participants* (`@workspace`, `@terminal`) están deprecados, los modos pasaron a ser **agentes** y casi toda la personalización vive en archivos del repo. Los de este repo están en [`.github/`](../.github/): conviene mirar primero [`copilot-instructions.md`](../.github/copilot-instructions.md).

## Sugerencias inline

| Acción | Atajo (VS Code) |
| --- | --- |
| Aceptar la sugerencia | `Tab` |
| Aceptar palabra por palabra | `Ctrl+→` |
| Descartar | `Esc` |
| Ver alternativas | `Alt+]` / `Alt+[` |

Además del *ghost text* están las **next edit suggestions**: después de un cambio, Copilot propone el próximo cambio relacionado (otro uso del símbolo que renombraste, por ejemplo) y `Tab` salta hasta él.

## Agentes del chat

| Agente | Para qué |
| --- | --- |
| **Ask** | entender código sin tocarlo ("¿cómo llega un request a la base?") |
| **Plan** | investigar y proponer un plan antes de cambiar nada (`/plan`) |
| **Agent** | implementar: busca código, edita archivos, corre comandos y tests |
| Inline chat (`Ctrl+I`) | un cambio puntual sobre la selección |

```text
Agregá un filtro ?q= a GET /api/todos que busque en el título.
No cambies el contrato de las otras rutas.
Corré dotnet test y decime qué tests agregaste.
```

Un buen pedido a un agente trae tres cosas: qué tiene que pasar, qué no puede romper y cómo verificarlo. Se pueden elegir el modelo (o **Auto**) y el *harness* (Copilot, Claude, Codex) por sesión.

## Contexto con `#`

```text
#selection          lo seleccionado en el editor
#TodoService.cs     un archivo (o carpeta, o símbolo) del picker
#search/codebase    búsqueda en todo el workspace
#read/problems      los errores del panel Problems
#execute/testFailure  el detalle del test que falló
#web/fetch          una página web
```

El agente busca contexto solo, pero adjuntar el archivo, el error o el output del test que importa ahorra vueltas.

## Slash commands

```text
/explain  /fix  /tests  /doc     sobre la selección o el archivo
/plan                            plan antes de implementar
/init                            genera o actualiza las instrucciones del workspace
/compact  /fork  /clear          manejar el contexto de la conversación
/tests-endpoint                  un prompt file del repo (ver abajo)
```

## Instrucciones del repo

```markdown
<!-- .github/copilot-instructions.md: siempre se aplican -->
- Antes de dar algo por terminado, corré `dotnet test` desde `backend/`.

<!-- .github/instructions/backend.instructions.md: solo para archivos que matchean -->
---
applyTo: "backend/**"
---
- Para la hora usá `TimeProvider` inyectado, no `DateTime.Now`.
```

`copilot-instructions.md` (o `AGENTS.md`, que leen varios agentes) va en todos los pedidos. Los `*.instructions.md` se suman solo cuando el agente trabaja con archivos que matchean `applyTo`. Conviene poner reglas que el código no dice solo: comandos de verificación, convenciones y qué no hacer.

## Prompt files

```markdown
<!-- .github/prompts/tests-endpoint.prompt.md → se invoca como /tests-endpoint -->
---
description: Generar tests de integración para un endpoint de la API
agent: agent
tools: ['search/codebase', 'read/readFile', 'edit/editFiles', 'execute/runInTerminal']
---
Escribí tests de integración para ${input:endpoint:por ejemplo PATCH /api/todos/{id}}.
Seguí el estilo de [TodosApiTests.cs](../../backend/Upskill.Api.Tests/Integration/TodosApiTests.cs).
```

Un prompt file es un pedido que se repite, guardado en el repo. `agent` elige el agente, `tools` limita las herramientas y `${input:...}` pide un dato al invocarlo.

## Custom agents y skills

```markdown
<!-- .github/agents/reviewer.agent.md → aparece en el dropdown de agentes -->
---
name: Reviewer
description: Revisa cambios buscando bugs y tests faltantes, sin editar archivos
tools: ['read', 'search']
---
Reportá solo lo accionable: archivo y línea, problema, impacto y fix sugerido.
```

Un **custom agent** es un rol con sus herramientas: este revisor no puede editar ni correr comandos. Una **skill** (`.github/skills/<nombre>/SKILL.md`) empaqueta un workflow con scripts o ejemplos, y el agente la carga cuando es relevante o con `/<nombre>`.

## MCP

```json
// .mcp.json en la raíz (o .vscode/mcp.json, con "servers" en lugar de "mcpServers")
{
  "mcpServers": {
    "playwright": { "command": "npx", "args": ["-y", "@playwright/mcp@latest"] },
    "context7": { "type": "http", "url": "https://mcp.context7.com/mcp" }
  }
}
```

Los servidores MCP le dan al agente herramientas externas: un browser, una base, el issue tracker. Cada tool pide confirmación según el nivel de permisos de la sesión.

## Copilot en GitHub

- **Code review:** pedirle review a Copilot en un PR, como a otra persona. Deja comentarios con sugerencias aplicables y usa las mismas instrucciones del repo.
- **Agente en la nube:** se le asigna un issue (o se lo delega desde el chat) y abre un PR desde una rama propia. Corre en GitHub Actions, así que respeta el CI.
- **Copilot CLI:** el agente en la terminal (`copilot`), con los mismos archivos de instrucciones, agentes y MCP.
- **Content exclusion:** en la configuración del repo o de la organización se excluyen rutas (secretos, código de terceros) para que Copilot no las lea.

## Docs oficiales

- [AI features cheat sheet de VS Code](https://code.visualstudio.com/docs/agents/reference/ai-features-cheat-sheet)
- [Inline suggestions](https://code.visualstudio.com/docs/editing/ai-powered-suggestions)
- [Tools y contexto (`#`)](https://code.visualstudio.com/docs/agents/reference/tools-reference)
- [Custom instructions](https://code.visualstudio.com/docs/agent-customization/custom-instructions)
- [Prompt files](https://code.visualstudio.com/docs/agent-customization/prompt-files)
- [Custom agents](https://code.visualstudio.com/docs/agent-customization/custom-agents)
- [Agent skills](https://code.visualstudio.com/docs/agent-customization/agent-skills)
- [MCP servers](https://code.visualstudio.com/docs/agent-customization/mcp-servers)
- [Copilot en GitHub](https://docs.github.com/copilot/concepts/copilot-surfaces/copilot-on-github)
- [Copilot CLI](https://docs.github.com/copilot/concepts/copilot-surfaces/copilot-cli)
- [Comparar customizaciones](https://docs.github.com/copilot/concepts/customizations/comparing-customizations)
- [Content exclusion](https://docs.github.com/copilot/how-tos/configure-content-exclusion/exclude-content-from-copilot)
