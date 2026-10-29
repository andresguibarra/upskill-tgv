using Microsoft.AspNetCore.Http.HttpResults;

namespace Upskill.Api.Todos;

public static class TodosEndpoints
{
    public static IEndpointRouteBuilder MapTodosEndpoints(this IEndpointRouteBuilder app)
    {
        var todos = app.MapGroup("/api/todos").WithTags("Todos");

        todos.MapGet("/", async (bool? done, TodoService svc, CancellationToken ct) =>
            TypedResults.Ok(await svc.ListAsync(done, ct)));

        todos.MapGet("/{id:int}", async Task<Results<Ok<TodoDto>, NotFound>> (int id, TodoService svc, CancellationToken ct) =>
            await svc.FindAsync(id, ct) is { } todo ? TypedResults.Ok(todo) : TypedResults.NotFound())
            .WithName("GetTodo");

        // La validación de DataAnnotations la hace AddValidation() antes del handler (400 si falla).
        todos.MapPost("/", async (CreateTodo body, TodoService svc, CancellationToken ct) =>
        {
            var todo = await svc.CreateAsync(body, ct);
            return TypedResults.CreatedAtRoute(todo, "GetTodo", new { id = todo.Id });
        });

        todos.MapPatch("/{id:int}", async Task<Results<Ok<TodoDto>, NotFound>> (int id, PatchTodo body, TodoService svc, CancellationToken ct) =>
            await svc.PatchAsync(id, body, ct) is { } todo ? TypedResults.Ok(todo) : TypedResults.NotFound());

        todos.MapDelete("/{id:int}", async Task<Results<NoContent, NotFound>> (int id, TodoService svc, CancellationToken ct) =>
            await svc.DeleteAsync(id, ct) ? TypedResults.NoContent() : TypedResults.NotFound());

        return app;
    }
}
