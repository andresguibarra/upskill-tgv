using System.ComponentModel.DataAnnotations;

namespace Upskill.Api.Todos;

public sealed class Todo
{
    public int Id { get; set; }
    public required string Title { get; set; }
    public bool Done { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
    public DateTimeOffset UpdatedAt { get; set; }
}

// Contrato con el frontend (frontend/src/dia-06/types.ts): Todo, Draft<Todo> y Patch<Todo>.
public sealed record TodoDto(int Id, string Title, bool Done);

public sealed record CreateTodo(
    [property: Required, StringLength(100, MinimumLength = 1)] string Title,
    bool Done = false);

// PATCH parcial: null = "no tocar".
public sealed record PatchTodo(
    [property: StringLength(100, MinimumLength = 1), RegularExpression(@".*\S.*", ErrorMessage = "El título no puede quedar vacío.")] string? Title,
    bool? Done);
