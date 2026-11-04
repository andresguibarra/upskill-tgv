# Día 20: Azure Pipelines en la práctica

El pipeline del [día 19](dia-19.md) pasa a multi-stage, con templates, un parámetro de runtime, artefactos y un stage de smoke test que levanta la API publicada. Conviene mirar primero [`azure-pipelines.yml`](../azure-pipelines.yml) y después [`pipelines/templates/`](../pipelines/templates/).

```
Build (backend ∥ frontend) ──► Smoke (descarga el artefacto api, GET /health)
  └─ artefactos: api, web
```

## Stages, dependencias y condiciones

```yaml
stages:
  - stage: Build
    jobs: [...]
  - stage: Smoke
    dependsOn: Build                     # por defecto, cada stage depende del anterior
    condition: succeeded()               # el default; and(...), eq(variables['Build.Reason'], 'PullRequest'), etc.
```

Los jobs de un stage corren en paralelo; los stages, en serie según `dependsOn`. `dependsOn: []` hace que un stage arranque en paralelo con el primero.

## Templates con parámetros

```yaml
# pipelines/templates/dotnet-build-test.yml
parameters:
  - name: workingDirectory
    type: string
  - name: coverageSettings
    type: string
    default: ''
steps:
  - script: dotnet build -c Release
    workingDirectory: ${{ parameters.workingDirectory }}

# azure-pipelines.yml
steps:
  - template: pipelines/templates/dotnet-build-test.yml
    parameters:
      workingDirectory: backend
      coverageSettings: backend/Upskill.Api.Tests/coverage.config
```

Hay templates de `steps`, `jobs`, `stages` y `variables`, y también `extends` (un template que envuelve todo el pipeline, útil para imponer reglas). Los parámetros son tipados (`string`, `boolean`, `number`, `object`, `stepList`, etc.) y se resuelven al compilar el YAML.

## Expresiones: compilación vs. runtime

```yaml
- ${{ if eq(parameters.coverageSettings, '') }}:     # compilación: inserta o no los steps
  - script: dotnet test --report-trx
- ${{ else }}:
  - script: dotnet test --report-trx --coverage ...

condition: succeededOrFailed()                       # runtime: se evalúa cuando llega el step
script: echo $(Build.SourceBranch)                   # macro: se reemplaza antes de correr el step
```

`${{ }}` solo ve parámetros y variables definidas en el YAML, no las de runtime ni las que se setean en un step. `$[ ]` (runtime) se usa en `variables` y `condition`, por ejemplo para leer outputs de otro job: `$[ dependencies.backend.outputs['paso.var'] ]`.

## Parámetros de runtime

```yaml
parameters:
  - name: runFrontend
    displayName: Incluir el frontend
    type: boolean
    default: true

jobs:
  - ${{ if eq(parameters.runFrontend, true) }}:
    - job: frontend
```

Aparecen como formulario en "Run pipeline". En un trigger automático se usa el `default`.

## Artefactos

```yaml
- script: dotnet publish Upskill.Api --no-build -c Release -o $(Build.ArtifactStagingDirectory)/api
- publish: $(Build.ArtifactStagingDirectory)/api     # atajo de PublishPipelineArtifact@1
  artifact: api

# en otro stage
- checkout: none
- download: current                                  # current = esta misma corrida
  artifact: api                                      # queda en $(Pipeline.Workspace)/api
```

Se compila una vez y lo que se testea es lo mismo que se deploya. El stage de deploy de mañana descarga este mismo artefacto.

## Cache

```yaml
variables:
  NUGET_PACKAGES: $(Pipeline.Workspace)/.nuget/packages
- task: Cache@2
  inputs:
    key: 'nuget | "$(Agent.OS)" | backend/**/*.csproj'
    path: $(NUGET_PACKAGES)
```

La key se arma con strings y hashes de archivos: si cambia algún `.csproj`, cambia la key. Con `packages.lock.json` la key sería más precisa, porque refleja también las versiones transitivas.

## Lo que encontró el smoke test

Publicada y corriendo en Production, la API respondía **503 Unhealthy** en `/health`: las migraciones solo se aplicaban en Development, así que la base no existía. Ahora se controlan con `Database:MigrateOnStartup` (en `true` en `appsettings.json`). Con SQLite y una instancia alcanza. Con varias instancias o una base compartida conviene apagarlo y migrar desde el pipeline con un migration bundle, que queda para el día 21.

## Validación

```bash
python3 tools/validate_azure_pipelines.py
# azure-pipelines.yml: válido
# pipelines/templates/dotnet-build-test.yml: válido (1 task(s) más nuevas que el schema sin validar)
# pipelines/templates/node-build-test.yml: válido
```

El validador ahora también revisa los templates y expande las ramas de `${{ if }}` / `${{ else }}`, porque el schema no entiende expresiones. Además pasa los escalares a string, como hace el parser de Azure (`default: true` es `"true"`). Detecta `dependOn` en lugar de `dependsOn`, `artefact` en lugar de `artifact` o un `testResultsFormat` inválido dentro de un template.

## Docs oficiales

- [Stages, dependencias y condiciones](https://learn.microsoft.com/azure/devops/pipelines/process/stages)
- [Templates](https://learn.microsoft.com/azure/devops/pipelines/process/templates)
- [Expresiones](https://learn.microsoft.com/azure/devops/pipelines/process/expressions)
- [Parámetros de runtime](https://learn.microsoft.com/azure/devops/pipelines/process/runtime-parameters)
- [Pipeline artifacts](https://learn.microsoft.com/azure/devops/pipelines/artifacts/pipeline-artifacts)
- [Cache de dependencias](https://learn.microsoft.com/azure/devops/pipelines/release/caching)
