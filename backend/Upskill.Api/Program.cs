using Upskill.Api.Demo;

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

// Errores como ProblemDetails (RFC 9457) y OpenAPI generado en runtime.
builder.Services.AddProblemDetails();
builder.Services.AddOpenApi();

var app = builder.Build();

app.UseExceptionHandler();   // excepción no manejada → 500 con ProblemDetails
app.UseStatusCodePages();    // 404/405 sin body → ProblemDetails

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();        // GET /openapi/v1.json
}

app.MapDemoEndpoints();

app.Run();

// Para WebApplicationFactory<Program> en los tests (bloque 6).
public partial class Program;
