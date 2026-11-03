# Día 19: Azure Pipelines (repaso)

Arranca el bloque 7 con [`azure-pipelines.yml`](../azure-pipelines.yml) en la raíz: el mismo CI que ya corre en GitHub Actions (`backend.yml` + `frontend.yml`), escrito para Azure DevOps y con publicación de resultados de tests y cobertura.

> **No corre desde GitHub.** Para usarlo hay que crear el pipeline en Azure DevOps (Pipelines > New pipeline > GitHub > este repo > *Existing Azure Pipelines YAML file*). Desde acá se valida contra el schema oficial con `python3 tools/validate_azure_pipelines.py`, y el workflow `azure-pipelines-lint.yml` lo hace en cada PR que toca el archivo.

## Estructura

```yaml
trigger:                    # push a main → corre
  branches: { include: [main] }
pr:                         # PR contra main → corre (solo para repos de GitHub/Bitbucket)
  branches: { include: [main] }

variables:
  buildConfiguration: Release     # se usa como $(buildConfiguration)

jobs:                       # sin `stages:` hay una sola etapa implícita
  - job: backend
    pool: { vmImage: ubuntu-latest }   # agente hosteado por Microsoft
    steps:
      - task: UseDotNet@2
        inputs: { packageType: sdk, version: 10.0.x }
      - script: dotnet build -c $(buildConfiguration)
        workingDirectory: backend
```

Jerarquía: `stages` > `jobs` > `steps`. Cada job corre en un agente nuevo y en paralelo con los demás, salvo que tenga `dependsOn`. Un step es un `script` (bash o cmd), una `task` del catálogo (`Nombre@versión`) o un `template`.

## Equivalencias con GitHub Actions

| GitHub Actions | Azure Pipelines |
| --- | --- |
| `on: push` / `on: pull_request` | `trigger:` / `pr:` |
| `runs-on: ubuntu-latest` | `pool: { vmImage: ubuntu-latest }` |
| `jobs.<id>.steps` | `jobs: - job: <id>` + `steps:` |
| `uses: actions/setup-dotnet@v4` | `task: UseDotNet@2` |
| `uses: actions/setup-node@v4` | `task: NodeTool@0` |
| `run:` | `script:` (o `bash:` / `pwsh:`) |
| `defaults.run.working-directory` | `workingDirectory:` en cada step |
| `${{ env.X }}` / `${{ vars.X }}` | `$(X)` (en runtime) o `${{ variables.X }}` (al compilar el YAML) |
| `if: always()` | `condition: succeededOrFailed()` (o `always()`) |
| `actions/cache` | `task: Cache@2` |
| `actions/upload-artifact` | `task: PublishPipelineArtifact@1` |
| `$GITHUB_STEP_SUMMARY` | pestañas **Tests** y **Code Coverage** del run |

## Resultados de tests y cobertura

```yaml
- script: >
    dotnet test --no-build -c $(buildConfiguration)
    --report-trx --results-directory $(Agent.TempDirectory)/backend
    --coverage --coverage-output-format cobertura --coverage-output coverage.cobertura.xml
    --coverage-settings $(Build.SourcesDirectory)/backend/Upskill.Api.Tests/coverage.config
- task: PublishTestResults@2
  condition: succeededOrFailed()          # publicar aunque haya tests rojos
  inputs: { testResultsFormat: VSTest, testResultsFiles: $(Agent.TempDirectory)/backend/**/*.trx }
- task: PublishCodeCoverageResults@2
  inputs: { summaryFileLocation: $(Agent.TempDirectory)/backend/coverage.cobertura.xml }
```

Con Microsoft.Testing.Platform, el TRX necesita el paquete `Microsoft.Testing.Extensions.TrxReport` y el flag `--report-trx`, porque el `--logger trx` de VSTest ya no aplica. En el frontend, Vitest genera JUnit con `--reporter=junit --outputFile.junit=test-results/junit.xml`, y `PublishTestResults@2` lo publica con `testResultsFormat: JUnit`. `PublishCodeCoverageResults@2` reemplaza a la `@1`, que está deprecada y pedía `codeCoverageTool`.

## Variables predefinidas que más se usan

| Variable | Qué es |
| --- | --- |
| `$(Build.SourcesDirectory)` | donde está el checkout |
| `$(Agent.TempDirectory)` | temporal del job, se limpia al terminar |
| `$(Build.ArtifactStagingDirectory)` | donde se arma lo que se publica como artefacto |
| `$(Pipeline.Workspace)` | raíz del workspace del job (ahí va la cache de npm) |
| `$(Build.SourceBranch)` / `$(Build.Reason)` | `refs/heads/main`, y `IndividualCI`, `PullRequest`, `Manual`, etc. |

## Validación

```bash
pip install pyyaml jsonschema
python3 tools/validate_azure_pipelines.py
# azure-pipelines.yml: válido (1 task(s) más nuevas que el schema sin validar: ['PublishCodeCoverageResults@2'])
```

Usa el mismo schema que la extensión de VS Code para Azure Pipelines, así que detecta keys mal escritas, inputs inexistentes y valores fuera de enum (por ejemplo, `testResultsFormat: Junitt`). El schema público todavía no trae `PublishCodeCoverageResults@2`, así que esa task se saltea a propósito. Lo que no puede validar es lo que depende de Azure DevOps: service connections, environments, permisos y variables secretas.

## Docs oficiales

- [Referencia del YAML de Azure Pipelines](https://learn.microsoft.com/azure/devops/pipelines/yaml-schema/)
- [Build, test y deploy de apps .NET Core](https://learn.microsoft.com/azure/devops/pipelines/ecosystems/dotnet-core)
- [Apps JavaScript (Node.js)](https://learn.microsoft.com/azure/devops/pipelines/ecosystems/javascript)
- [Variables predefinidas](https://learn.microsoft.com/azure/devops/pipelines/build/variables)
- [Migrar de GitHub Actions a Azure Pipelines (y viceversa)](https://learn.microsoft.com/azure/devops/pipelines/migrate/from-github-actions)
- [`PublishCodeCoverageResults@2`](https://learn.microsoft.com/azure/devops/pipelines/tasks/reference/publish-code-coverage-results-v2)
