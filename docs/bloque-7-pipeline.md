# Pipeline CI/CD con deploy (entregable del bloque 7)

El plan pedía un pipeline funcional con build, tests y deploy. [`azure-pipelines.yml`](../azure-pipelines.yml) lo arma en cuatro stages: compila y testea una vez, prueba el artefacto y deploya **ese mismo artefacto** a dev y después a prod. Los días [19](dia-19.md) y [20](dia-20.md) tienen la ayuda memoria de stages, templates y artefactos. Conviene mirar primero el pipeline y después [`pipelines/templates/deploy-webapp.yml`](../pipelines/templates/deploy-webapp.yml).

```
Build ──────────────► Smoke ──────────► DeployDev ─────────► DeployProd
backend ∥ frontend    API publicada     environment          environment
tests + cobertura     GET /health       upskill-dev          upskill-prod (con aprobación)
artefactos api, web                     solo main, no PRs
```

| Stage | Corre en | Qué hace |
| --- | --- | --- |
| `Build` | PRs y main | build `-warnaserror`, 36 tests .NET con cobertura, type-check + Vitest + build del frontend, artefactos `api` y `web` |
| `Smoke` | PRs y main | baja `api`, la levanta con el runtime de .NET 10 y espera `Healthy` |
| `DeployDev` | solo main | deploy a App Service `upskill-tgv-api-dev` y `GET /health` contra la URL real |
| `DeployProd` | después de dev | lo mismo contra `upskill-tgv-api`, frenado por la aprobación del environment |

## Deployment job y environment

```yaml
jobs:
  - deployment: api                    # no "job": registra el deploy en el environment
    environment: upskill-prod          # historial, approvals y checks; se crea en el primer run
    strategy:
      runOnce:                         # también hay rolling y canary
        deploy:
          steps:                       # acá el artefacto ya está en $(Pipeline.Workspace)/api
            - task: AzureWebApp@1
              inputs:
                azureSubscription: upskill-azure     # service connection, nombre fijo al compilar
                appType: webAppLinux
                appName: upskill-tgv-api
                package: $(Pipeline.Workspace)/api   # carpeta o .zip
                appSettings: -Database__MigrateOnStartup true -ConnectionStrings__App "Data Source=/home/upskill.db"
        on:
          failure:
            steps: [...]               # hook si falla el deploy (aviso, rollback)
```

Un deployment job no hace checkout y descarga solo los artefactos del run en el hook `deploy`. El environment guarda qué commit está deployado en cada lugar, y ahí se cuelgan las aprobaciones.

## Solo desde main

```yaml
- stage: DeployDev
  dependsOn: Smoke
  condition: and(succeeded(), eq(variables['Build.SourceBranch'], 'refs/heads/main'), ne(variables['Build.Reason'], 'PullRequest'))
- stage: DeployProd
  dependsOn: DeployDev                 # condition por defecto succeeded(): si dev se saltea, prod también
```

En un PR corren `Build` y `Smoke`, y los dos deploys quedan como *skipped*.

## Aprobación manual

No va en el YAML. Se configura en **Pipelines > Environments > upskill-prod > Approvals and checks**: aprobadores, timeout, horario permitido o un check de Azure Monitor. El run espera en `DeployProd` hasta que alguien apruebe.

## Variables que necesita el compilador

```yaml
variables:
  azureServiceConnection: upskill-azure
jobs:
  - template: pipelines/templates/deploy-webapp.yml
    parameters:
      serviceConnection: ${{ variables.azureServiceConnection }}
```

`azureSubscription` se autoriza al compilar el YAML, así que tiene que ser un literal o `${{ }}`, nunca `$(var)` de runtime ni una variable de un variable group. Los secretos (por ejemplo un connection string de SQL) sí pueden venir de un variable group o de Key Vault con `$(...)`.

## Migraciones en el deploy

La API migra al arrancar (`Database:MigrateOnStartup`). Con SQLite y una sola instancia alcanza, y el deploy lo prende por app setting. Con SQL Server y varias instancias conviene apagarlo y migrar desde el pipeline con un *migration bundle*, que no está implementado acá:

```yaml
# en Build
- script: dotnet ef migrations bundle --project Upskill.Api -o $(Build.ArtifactStagingDirectory)/migrate/efbundle --self-contained -r linux-x64
# en el deploy, antes de AzureWebApp@1
- script: $(Pipeline.Workspace)/migrate/efbundle --connection "$(SqlConnectionString)"
```

## Puesta en marcha en Azure DevOps (una vez)

Esto no se puede correr desde GitHub: necesita una organización de Azure DevOps y una suscripción de Azure.

```bash
az group create -n upskill-tgv -l brazilsouth
az appservice plan create -g upskill-tgv -n upskill-plan --is-linux --sku B1
az webapp create -g upskill-tgv -p upskill-plan -n upskill-tgv-api-dev --runtime "DOTNETCORE:10.0"
az webapp create -g upskill-tgv -p upskill-plan -n upskill-tgv-api     --runtime "DOTNETCORE:10.0"
```

1. **Project settings > Service connections > Azure Resource Manager** (workload identity federation) con nombre `upskill-azure`.
2. **Pipelines > New pipeline > GitHub > upskill-tgv > Existing Azure Pipelines YAML file** y elegir `azure-pipelines.yml`.
3. En el primer run se crean los environments. Después, sumar la aprobación a `upskill-prod`.

## Qué está verificado y qué no

- **Verificado:** el pipeline y los tres templates pasan el schema oficial (`python3 tools/validate_azure_pipelines.py`, que también corre en el CI de GitHub). La API publicada levanta en Production con los mismos app settings del deploy, responde `Healthy` y crea la base SQLite. El build y los tests son los mismos que corren en GitHub Actions.
- **No verificado:** el deploy en sí, porque no hay suscripción de Azure ni organización de Azure DevOps conectadas. El schema publicado es más viejo que .NET 10 y no conoce `DOTNETCORE|10.0` como `runtimeStack`, por eso el stack se fija al crear la app (`--runtime "DOTNETCORE:10.0"`) y no en la task.

## Docs oficiales

- [Deployment jobs](https://learn.microsoft.com/azure/devops/pipelines/process/deployment-jobs)
- [Environments](https://learn.microsoft.com/azure/devops/pipelines/process/environments)
- [Approvals and checks](https://learn.microsoft.com/azure/devops/pipelines/process/approvals)
- [AzureWebApp@1](https://learn.microsoft.com/azure/devops/pipelines/tasks/reference/azure-web-app-v1)
- [Service connection a Azure](https://learn.microsoft.com/azure/devops/pipelines/library/connect-to-azure)
- [Migration bundles de EF Core](https://learn.microsoft.com/ef/core/managing-schemas/migrations/applying#bundles)
