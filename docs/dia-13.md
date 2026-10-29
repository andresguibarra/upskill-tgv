# Día 13: ASP.NET Core moderno (repaso)

Ayuda memoria de Minimal APIs en .NET 10. El código está en [`backend/Upskill.Api/`](../backend/Upskill.Api/): `Program.cs` arma el host y [`Demo/DemoEndpoints.cs`](../backend/Upskill.Api/Demo/DemoEndpoints.cs) tiene los endpoints.

```bash
cd backend && dotnet run --project Upskill.Api   # http://localhost:5101
curl localhost:5101/api/demo/hello/Andres         # {"message":"Hola, Andres (11:50)"}
```

## Host y pipeline

```csharp
var builder = WebApplication.CreateBuilder(args); // config + logging + DI
builder.Services.AddProblemDetails();
builder.Services.AddOpenApi();
var app = builder.Build();
app.UseExceptionHandler();                          // el orden de los Use* es el orden del pipeline
if (app.Environment.IsDevelopment()) app.MapOpenApi(); // GET /openapi/v1.json
app.Run();
public partial class Program;                       // visible para WebApplicationFactory (bloque 6)
```

Todo lo que se registra en `builder.Services` va antes de `Build()`. Después de `Build()` solo se arma el pipeline de middlewares y endpoints.

## Inyección de dependencias

```csharp
builder.Services.AddSingleton(TimeProvider.System); // una instancia para toda la app
builder.Services.AddScoped<IGreeter, Greeter>();    // una por request
builder.Services.AddTransient<IFoo, Foo>();         // una nueva cada vez que se resuelve

public sealed class Greeter(IOptions<GreetingOptions> options, TimeProvider time) : IGreeter { … }
```

Un singleton no puede depender de un scoped: en Development el contenedor lo detecta y tira una excepción (scope validation). `TimeProvider` reemplaza a `DateTime.Now` y se puede falsear en los tests.

## Options pattern

```csharp
builder.Services.AddOptions<GreetingOptions>()
    .BindConfiguration("Greeting")   // appsettings.json → { "Greeting": { "Prefix": "Hola" } }
    .ValidateDataAnnotations()
    .ValidateOnStart();              // la app no arranca con config inválida
```

`IOptions<T>` lee el valor una vez, `IOptionsSnapshot<T>` lo relee por request (scoped) e `IOptionsMonitor<T>` avisa cuando cambia. Las variables de entorno pisan a appsettings con `__`: `Greeting__Prefix=Buenas`.

## Endpoints, binding y resultados tipados

```csharp
var demo = app.MapGroup("/api/demo").WithTags("Demo");

demo.MapGet("/items/{id:int}", Results<Ok<Item>, NotFound> (int id, ItemStore store) =>
    store.Find(id) is { } item ? TypedResults.Ok(item) : TypedResults.NotFound())
    .WithName("GetItem");

demo.MapPost("/items", (CreateItem body, ItemStore store) =>
{
    var item = store.Add(body.Name);
    return TypedResults.CreatedAtRoute(item, "GetItem", new { id = item.Id });  // 201 + Location
});
```

El binding es por convención: la ruta gana si el nombre coincide, los tipos simples vienen del query, los complejos del body (JSON) y los registrados en DI se inyectan. Se puede forzar con `[FromRoute]`, `[FromQuery]`, `[FromBody]`, `[FromServices]` o `[AsParameters]`. `Results<A, B>` hace que el compilador verifique las respuestas posibles y que OpenAPI las documente sin `.Produces<T>()`. Un `CancellationToken` en el handler se cancela si el cliente corta.

## Endpoint filters

```csharp
demo.MapPost("/items", …).AddEndpointFilter(async (ctx, next) =>
{
    var body = ctx.GetArgument<CreateItem>(0);
    return IsValid(body) ? await next(ctx) : TypedResults.ValidationProblem(errors);
});
```

Es un middleware a nivel de endpoint: ve los argumentos ya bindeados y puede cortar antes del handler. Si se pone en el grupo, aplica a todos sus endpoints.

## Errores con ProblemDetails

| Caso | Respuesta |
| --- | --- |
| `TypedResults.NotFound()` + `UseStatusCodePages()` | 404 `application/problem+json` |
| `TypedResults.ValidationProblem(dict)` | 400 con `errors: { Name: [...] }` |
| Excepción no manejada + `UseExceptionHandler()` | 500 sin stack trace (en prod) |

`AddProblemDetails()` hace que todas las respuestas de error sigan el formato del RFC 9457, el mismo que puede leer `http()` del frontend. Para mapear excepciones propias a otros códigos se implementa `IExceptionHandler`.

## Docs oficiales

- [Minimal APIs: referencia rápida](https://learn.microsoft.com/aspnet/core/fundamentals/minimal-apis)
- [Route groups](https://learn.microsoft.com/aspnet/core/fundamentals/minimal-apis/route-handlers#route-groups) y [parameter binding](https://learn.microsoft.com/aspnet/core/fundamentals/minimal-apis/parameter-binding)
- [Crear respuestas (`TypedResults`, `Results<>`)](https://learn.microsoft.com/aspnet/core/fundamentals/minimal-apis/responses)
- [Endpoint filters](https://learn.microsoft.com/aspnet/core/fundamentals/minimal-apis/min-api-filters)
- [Inyección de dependencias y lifetimes](https://learn.microsoft.com/aspnet/core/fundamentals/dependency-injection)
- [Options pattern](https://learn.microsoft.com/aspnet/core/fundamentals/configuration/options)
- [Manejo de errores y ProblemDetails](https://learn.microsoft.com/aspnet/core/fundamentals/error-handling-api)
- [OpenAPI en ASP.NET Core](https://learn.microsoft.com/aspnet/core/fundamentals/openapi/overview)
