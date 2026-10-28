using System.Diagnostics;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using Upskill.Api.Data;
using Upskill.Api.Demo;
using Upskill.Api.Practica;
using Upskill.Api.Todos;

var builder = WebApplication.CreateBuilder(args);

// Options: la sección "Greeting" del appsettings, validada al arrancar.
builder.Services.AddOptions<GreetingOptions>()
    .BindConfiguration(GreetingOptions.Section)
    .ValidateDataAnnotations()
    .ValidateOnStart();

// DI: singleton (uno para toda la app), scoped (uno por request), transient (uno por resolución).
builder.Services.AddSingleton(TimeProvider.System);
builder.Services.AddScoped<IGreeter, Greeter>();
builder.Services.AddSingleton<ItemStore>();

// EF Core: el DbContext es scoped (uno por request).
builder.Services.AddDbContext<AppDbContext>(o =>
    o.UseSqlite(builder.Configuration.GetConnectionString("App")));

// CRUD de todos (entregable del bloque 5): servicio scoped, igual que el DbContext.
builder.Services.AddScoped<TodoService>();

// .NET 10: valida los DataAnnotations de los parámetros de los endpoints y devuelve 400 con ProblemDetails.
builder.Services.AddValidation();

// Errores como ProblemDetails (RFC 9457); los handlers propios corren antes que el de por defecto.
builder.Services.AddProblemDetails();
builder.Services.AddExceptionHandler<ConflictExceptionHandler>();
builder.Services.AddOpenApi();

// CORS para el dev server de Vite.
builder.Services.AddCors(o => o.AddPolicy("frontend", p =>
    p.WithOrigins("http://localhost:5173").AllowAnyHeader().AllowAnyMethod()));

// Rate limiting: 5 requests cada 10 segundos por política; el resto recibe 429.
builder.Services.AddRateLimiter(o =>
{
    o.RejectionStatusCode = StatusCodes.Status429TooManyRequests;
    o.AddFixedWindowLimiter("fixed", w => { w.PermitLimit = 5; w.Window = TimeSpan.FromSeconds(10); });
});

builder.Services.AddHealthChecks().AddDbContextCheck<AppDbContext>();

var app = builder.Build();

app.UseExceptionHandler();   // excepción no manejada → 500 con ProblemDetails
app.UseStatusCodePages();    // 404/405 sin body → ProblemDetails

// Middleware inline: lo de antes de next() corre a la ida, lo de después a la vuelta.
app.Use(async (http, next) =>
{
    var start = Stopwatch.GetTimestamp();
    http.Response.OnStarting(() =>
    {
        http.Response.Headers["X-Elapsed-Ms"] = Stopwatch.GetElapsedTime(start).TotalMilliseconds.ToString("0");
        return Task.CompletedTask;
    });
    await next(http);
});

app.UseCors("frontend");
app.UseRateLimiter();

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();        // GET /openapi/v1.json

    // Aplica las migraciones pendientes al arrancar (solo en dev; en prod va en el pipeline).
    using var scope = app.Services.CreateScope();
    scope.ServiceProvider.GetRequiredService<AppDbContext>().Database.Migrate();
}

app.MapHealthChecks("/health");
app.MapDemoEndpoints();
app.MapNotesEndpoints();
app.MapTodosEndpoints();

app.Run();

// Para WebApplicationFactory<Program> en los tests (bloque 6).
public partial class Program;
