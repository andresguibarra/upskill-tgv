# Día 17: tests de integración con WebApplicationFactory

Son 9 tests de integración que levantan la API real en memoria y le pegan por HTTP, más un mock con NSubstitute. En total, el proyecto tiene 23 tests (14 unit + 9 integración). Conviene mirar primero [`Integration/ApiFactory.cs`](../backend/Upskill.Api.Tests/Integration/ApiFactory.cs).

```bash
cd backend && dotnet test --filter-namespace "*Integration"
```

## La factory

```csharp
public sealed class ApiFactory : WebApplicationFactory<Program>   // necesita `public partial class Program;`
{
    private readonly SqliteConnection _connection = new("Data Source=:memory:");
    public FakeTimeProvider Time { get; } = new(…);

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");
        builder.ConfigureTestServices(services =>                  // corre DESPUÉS de Program.cs
        {
            _connection.Open();
            services.RemoveAll<IDbContextOptionsConfiguration<AppDbContext>>();
            services.AddDbContext<AppDbContext>(o => o.UseSqlite(_connection));
            services.RemoveAll<TimeProvider>();
            services.AddSingleton<TimeProvider>(Time);
        });
    }
}
```

`WebApplicationFactory` arranca `Program.cs` con `TestServer`: mismo pipeline, middlewares, DI y endpoints, pero sin abrir un puerto. `CreateClient()` devuelve un `HttpClient` que ya apunta a ese server. Desde EF Core 9, para cambiar el provider se borra `IDbContextOptionsConfiguration<T>`; antes se borraba `DbContextOptions<T>`.

## Tests contra HTTP

```csharp
var res = await _client.PostAsJsonAsync("/api/todos", new { title = " Integración " }, ct);
Assert.Equal(HttpStatusCode.Created, res.StatusCode);
Assert.Equal("/api/todos/1", res.Headers.Location?.AbsolutePath);
Assert.Equal(new TodoDto(1, "Integración", false), await res.Content.ReadFromJsonAsync<TodoDto>(ct));

var problem = await res.Content.ReadFromJsonAsync<ValidationProblemDetails>(ct);
Assert.Contains("Title", problem!.Errors.Keys);
```

Lo que un unit test no ve y estos sí: routing y constraints (`{id:int}`), binding del query (`?done=true`), `AddValidation()`, status codes, headers, el formato ProblemDetails, el orden de los middlewares y el `IExceptionHandler`.

## Aislamiento: factory por test o compartida

```csharp
// Una factory por test: base limpia, independiente del orden (TodosApiTests).
public sealed class TodosApiTests : IAsyncDisposable { private readonly ApiFactory _factory = new(); … }

// Una factory por clase: arranca una vez, pero los tests comparten la base (PipelineTests).
public sealed class PipelineTests(ApiFactory factory) : IClassFixture<ApiFactory> { … }
```

Arrancar el host cuesta unos 100 a 200 ms, así que para suites grandes conviene compartirlo y limpiar los datos entre tests, por ejemplo con Respawn o una transacción por test. Por defecto xUnit corre en paralelo las clases distintas y en serie los tests de una misma clase.

## Reemplazar un servicio con un mock (NSubstitute)

```csharp
var greeter = Substitute.For<IGreeter>();
greeter.Greet("Andres").Returns("hola desde el mock");

var client = factory.WithWebHostBuilder(b => b.ConfigureTestServices(s =>
{
    s.RemoveAll<IGreeter>();
    s.AddScoped(_ => greeter);
})).CreateClient();

greeter.Received(1).Greet("Andres");                          // verificación de la interacción
```

`WithWebHostBuilder` crea una variante de la factory solo para ese test. El mock tiene sentido para dependencias externas (APIs, colas, email); para la base conviene SQLite o una base real con Testcontainers, no un mock.

## Docs oficiales

- [Integration tests en ASP.NET Core](https://learn.microsoft.com/aspnet/core/test/integration-tests)
- [Testing de Minimal APIs](https://learn.microsoft.com/aspnet/core/fundamentals/minimal-apis/test-min-api)
- [EF Core: testing contra la base de producción vs. dobles](https://learn.microsoft.com/ef/core/testing/)
- [xUnit: compartir contexto entre tests (fixtures)](https://xunit.net/docs/shared-context)
- [NSubstitute](https://nsubstitute.github.io/help/getting-started/)
