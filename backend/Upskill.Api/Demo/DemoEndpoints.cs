using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Http.HttpResults;

namespace Upskill.Api.Demo;

public static class DemoEndpoints
{
    public static IEndpointRouteBuilder MapDemoEndpoints(this IEndpointRouteBuilder app)
    {
        // Route group: prefijo, tag de OpenAPI y filtros compartidos.
        var demo = app.MapGroup("/api/demo").WithTags("Demo");

        // Los parámetros se resuelven solos: ruta, query, body o servicio de DI.
        demo.MapGet("/hello/{name}", (string name, IGreeter greeter) =>
            TypedResults.Ok(new { message = greeter.Greet(name) }));

        // Results<A, B>: el tipo documenta cada respuesta posible (y OpenAPI la ve).
        demo.MapGet("/items/{id:int}", Results<Ok<Item>, NotFound> (int id, ItemStore store) =>
            store.Find(id) is { } item ? TypedResults.Ok(item) : TypedResults.NotFound())
            .WithName("GetItem");

        demo.MapPost("/items", (CreateItem body, ItemStore store) =>
            {
                var item = store.Add(body.Name.Trim());
                return TypedResults.CreatedAtRoute(item, "GetItem", new { id = item.Id });
            })
            .AddEndpointFilter(ValidateBody<CreateItem>);

        // CancellationToken: se cancela si el cliente corta la conexión.
        demo.MapGet("/slow", async (CancellationToken ct) =>
        {
            await Task.Delay(TimeSpan.FromSeconds(2), ct);
            return TypedResults.Ok("listo");
        });

        demo.MapGet("/boom", string () => throw new InvalidOperationException("Algo salió mal"));

        return app;
    }

    // Endpoint filter: corre antes del handler, como un middleware por endpoint.
    private static async ValueTask<object?> ValidateBody<T>(EndpointFilterInvocationContext ctx, EndpointFilterDelegate next)
    {
        var body = ctx.Arguments.OfType<T>().Single();
        var errors = new List<ValidationResult>();
        if (!Validator.TryValidateObject(body!, new ValidationContext(body!), errors, validateAllProperties: true))
        {
            return TypedResults.ValidationProblem(errors
                .GroupBy(e => e.MemberNames.FirstOrDefault() ?? "")
                .ToDictionary(g => g.Key, g => g.Select(e => e.ErrorMessage ?? "Inválido").ToArray()));
        }
        return await next(ctx);
    }
}
