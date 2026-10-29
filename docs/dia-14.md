# Día 14: ASP.NET Core en la práctica

Sobre la API del [día 13](dia-13.md) se suman EF Core con SQLite, un middleware propio, un `IExceptionHandler`, CORS, rate limiting y health checks. Los endpoints de práctica son `/api/notes` en [`Practica/NotesEndpoints.cs`](../backend/Upskill.Api/Practica/NotesEndpoints.cs), y el modelo está en [`Data/AppDbContext.cs`](../backend/Upskill.Api/Data/AppDbContext.cs).

```bash
cd backend && dotnet tool restore
dotnet ef migrations add <Nombre> --project Upskill.Api -o Data/Migrations
dotnet run --project Upskill.Api        # en Development aplica las migraciones al arrancar
curl -X POST localhost:5101/api/notes -H 'content-type: application/json' -d '{"title":"EF Core"}'
```

## EF Core: DbContext y migraciones

```csharp
public sealed class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<Note> Notes => Set<Note>();
    protected override void OnModelCreating(ModelBuilder model) =>
        model.Entity<Note>(e => { e.Property(n => n.Title).HasMaxLength(100); e.HasIndex(n => n.Title).IsUnique(); });
}

builder.Services.AddDbContext<AppDbContext>(o => o.UseSqlite(builder.Configuration.GetConnectionString("App")));
```

El `DbContext` es scoped: una unidad de trabajo por request, y no es thread-safe. Las migraciones son código versionado que sale de comparar el modelo con el snapshot. `dotnet ef database update` las aplica a mano, y `Database.Migrate()` lo hace al arrancar (solo conviene en dev). `dotnet-ef` va como herramienta local en `dotnet-tools.json`.

## Consultas

```csharp
db.Notes.AsNoTracking()                                   // solo lectura: sin change tracker
    .Where(n => n.Title.Contains(search))
    .OrderByDescending(n => n.Pinned).ThenBy(n => n.Id)
    .Skip((page - 1) * size).Take(size)
    .Select(n => new NoteDto(n.Id, n.Title, n.Pinned))    // proyección: SELECT solo de esas columnas
    .ToListAsync(ct);

db.Notes.Add(note); await db.SaveChangesAsync(ct);        // tracking → INSERT, y completa note.Id
await db.Notes.Where(n => n.Id == id)
    .ExecuteUpdateAsync(s => s.SetProperty(n => n.Pinned, n => !n.Pinned), ct); // UPDATE directo
await db.Notes.Where(n => n.Id == id).ExecuteDeleteAsync(ct);                   // DELETE directo
```

El `IQueryable` se arma en memoria y se traduce a SQL recién con `ToListAsync`, `FirstOrDefaultAsync`, etc. `ExecuteUpdate`/`ExecuteDelete` no pasan por el change tracker y devuelven las filas afectadas, que sirven para decidir entre 204 y 404. `[AsParameters]` bindea un record entero desde el query string.

## Middleware

```csharp
app.Use(async (http, next) =>
{
    var start = Stopwatch.GetTimestamp();
    http.Response.OnStarting(() => { http.Response.Headers["X-Elapsed-Ms"] = …; return Task.CompletedTask; });
    await next(http);                                     // lo de después corre a la vuelta
});
```

El orden de los `app.Use*` es el orden del pipeline: `UseExceptionHandler` primero, para envolver todo, y después `UseCors` y `UseRateLimiter`, antes de los endpoints. Los headers se escriben en `OnStarting`, porque una vez que empezó el body ya no se pueden cambiar.

## Excepciones propias → status code

```csharp
public sealed class ConflictExceptionHandler(IProblemDetailsService pd) : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(HttpContext http, Exception ex, CancellationToken ct)
    {
        if (ex is not ConflictException) return false;    // false → sigue el siguiente handler (500)
        http.Response.StatusCode = 409;
        return await pd.TryWriteAsync(new() { HttpContext = http, Exception = ex, ProblemDetails = { Title = "Conflicto" } });
    }
}
builder.Services.AddExceptionHandler<ConflictExceptionHandler>();
```

Los handlers corren en el orden en que se registran, y el primero que devuelve `true` corta la cadena. Sirve para que el dominio lance excepciones sin conocer HTTP.

## CORS, rate limiting y health checks

```csharp
builder.Services.AddCors(o => o.AddPolicy("frontend", p => p.WithOrigins("http://localhost:5173").AllowAnyHeader().AllowAnyMethod()));
builder.Services.AddRateLimiter(o =>
{
    o.RejectionStatusCode = 429;
    o.AddFixedWindowLimiter("fixed", w => { w.PermitLimit = 5; w.Window = TimeSpan.FromSeconds(10); });
});
builder.Services.AddHealthChecks().AddDbContextCheck<AppDbContext>();

app.UseCors("frontend"); app.UseRateLimiter();
app.MapGroup("/api/notes").RequireRateLimiting("fixed");
app.MapHealthChecks("/health");                           // "Healthy" si la base responde
```

CORS solo lo aplica el navegador: con curl no cambia nada, salvo el header en la respuesta al preflight (`OPTIONS`). Además de la ventana fija hay sliding window, token bucket y concurrency, y se puede particionar por usuario o IP con `PartitionedRateLimiter`. Los health checks se pueden separar en liveness y readiness con tags.

## Docs oficiales

- [EF Core: DbContext y configuración](https://learn.microsoft.com/ef/core/dbcontext-configuration/) y [migraciones](https://learn.microsoft.com/ef/core/managing-schemas/migrations/)
- [Consultas eficientes](https://learn.microsoft.com/ef/core/performance/efficient-querying) y [ExecuteUpdate/ExecuteDelete](https://learn.microsoft.com/ef/core/saving/execute-insert-update-delete)
- [Middleware en ASP.NET Core](https://learn.microsoft.com/aspnet/core/fundamentals/middleware/)
- [IExceptionHandler](https://learn.microsoft.com/aspnet/core/fundamentals/error-handling#iexceptionhandler)
- [CORS](https://learn.microsoft.com/aspnet/core/security/cors)
- [Rate limiting](https://learn.microsoft.com/aspnet/core/performance/rate-limit)
- [Health checks](https://learn.microsoft.com/aspnet/core/host-and-deploy/health-checks)
