# Día 16: testing backend con xUnit (repaso)

Arranca el bloque 6 con un proyecto [`backend/Upskill.Api.Tests`](../backend/Upskill.Api.Tests/) (xUnit v3) y 14 unit tests sobre lo que armó el bloque 5. Conviene mirar primero [`Unit/TodoServiceTests.cs`](../backend/Upskill.Api.Tests/Unit/TodoServiceTests.cs).

```bash
cd backend && dotnet test                                    # corre todo el .slnx
dotnet test --filter-method "*Patch*"                        # filtro de Microsoft.Testing.Platform
```

## Proyecto

```xml
<OutputType>Exe</OutputType>                                  <!-- xUnit v3: el proyecto de tests es un ejecutable -->
<PackageReference Include="xunit.v3" />
<PackageReference Include="Microsoft.Extensions.TimeProvider.Testing" />
<ProjectReference Include="..\Upskill.Api\Upskill.Api.csproj" />
```

```json
// backend/global.json: .NET 10 + xUnit v3 corren dotnet test sobre Microsoft.Testing.Platform (no VSTest)
{ "test": { "runner": "Microsoft.Testing.Platform" } }
```

Sin ese `global.json`, `dotnet test` en .NET 10 falla con "Testing with VSTest target is no longer supported". `Microsoft.NET.Test.Sdk` y `xunit.runner.visualstudio` quedan solo para el Test Explorer de los IDE.

## Fact, Theory y ciclo de vida

```csharp
public sealed class TodoServiceTests : IDisposable          // una instancia nueva por test
{
    private readonly SqliteDb _db = new();                    // constructor = setup
    public void Dispose() => _db.Dispose();                   // Dispose = teardown

    [Fact] public async Task Patch_de_un_id_inexistente_devuelve_null() => …

    [Theory]
    [InlineData(null, 3)]
    [InlineData(true, 1)]
    public async Task List_filtra_por_done(bool? done, int expected) => …
}

public static TheoryData<CreateTodo, bool> Creates => new() { { new CreateTodo(""), false } };
[Theory, MemberData(nameof(Creates))] public void CreateTodo_valida_el_titulo(CreateTodo input, bool valid) => …
```

Para compartir algo caro entre los tests de una clase se usa `IClassFixture<T>`, y entre clases, `ICollectionFixture<T>`. Para setup async, `IAsyncLifetime`. `TestContext.Current.CancellationToken` (v3) se cancela si se aborta la corrida.

## Base de datos en los unit tests

```csharp
var connection = new SqliteConnection("Data Source=:memory:");
connection.Open();                                            // la base vive mientras la conexión esté abierta
var db = new AppDbContext(new DbContextOptionsBuilder<AppDbContext>().UseSqlite(connection).Options);
db.Database.EnsureCreated();
```

SQLite en memoria ejecuta SQL de verdad (constraints, `ExecuteDelete`, traducción de LINQ), algo que el provider `InMemory` de EF no hace y que la doc ya no recomienda. Conviene crear un contexto nuevo para el arrange, otro para el act y otro para el assert: con uno solo, el change tracker devuelve la entidad cacheada y puede ocultar un bug.

## Dobles de prueba sin librería de mocks

```csharp
var time = new FakeTimeProvider(new DateTimeOffset(2026, 10, 29, 12, 0, 0, TimeSpan.Zero));
time.Advance(TimeSpan.FromMinutes(5));                        // el tiempo avanza cuando el test quiere
var greeter = new Greeter(Options.Create(new GreetingOptions { Prefix = "Buenas" }), time);
```

Como el código recibe `TimeProvider` e `IOptions<T>` por DI, los tests pasan instancias concretas y no hace falta mockear. Las librerías de mocks (NSubstitute, Moq) se reservan para interfaces propias con comportamiento.

## Asserts útiles

```csharp
Assert.Equal(created with { Done = true }, patched);         // records: igualdad por valor
Assert.All(list, t => Assert.True(t.Done));
Assert.Null(await svc.FindAsync(id, ct));
await Assert.ThrowsAsync<ConflictException>(() => …);
```

## Docs oficiales

- [Unit testing en .NET con xUnit](https://learn.microsoft.com/dotnet/core/testing/unit-testing-csharp-with-xunit)
- [xUnit v3: novedades y migración](https://xunit.net/docs/getting-started/v3/whats-new)
- [`dotnet test` con Microsoft.Testing.Platform](https://learn.microsoft.com/dotnet/core/testing/unit-testing-with-dotnet-test)
- [EF Core: elegir una estrategia de testing](https://learn.microsoft.com/ef/core/testing/choosing-a-testing-strategy)
- [`FakeTimeProvider`](https://learn.microsoft.com/dotnet/api/microsoft.extensions.time.testing.faketimeprovider)
