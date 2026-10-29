using Microsoft.EntityFrameworkCore;
using Upskill.Api.Data;

namespace Upskill.Api.Todos;

// La lógica vive acá y no en los endpoints: se testea sin HTTP (bloque 6).
public sealed class TodoService(AppDbContext db, TimeProvider time)
{
    public Task<List<TodoDto>> ListAsync(bool? done, CancellationToken ct) =>
        db.Todos.AsNoTracking()
            .Where(t => done == null || t.Done == done)
            .OrderBy(t => t.Id)
            .Select(t => new TodoDto(t.Id, t.Title, t.Done))
            .ToListAsync(ct);

    public Task<TodoDto?> FindAsync(int id, CancellationToken ct) =>
        db.Todos.AsNoTracking()
            .Where(t => t.Id == id)
            .Select(t => new TodoDto(t.Id, t.Title, t.Done))
            .FirstOrDefaultAsync(ct);

    public async Task<TodoDto> CreateAsync(CreateTodo input, CancellationToken ct)
    {
        var now = time.GetUtcNow();
        var todo = new Todo { Title = input.Title.Trim(), Done = input.Done, CreatedAt = now, UpdatedAt = now };
        db.Todos.Add(todo);
        await db.SaveChangesAsync(ct);
        return ToDto(todo);
    }

    public async Task<TodoDto?> PatchAsync(int id, PatchTodo patch, CancellationToken ct)
    {
        var todo = await db.Todos.FindAsync([id], ct);
        if (todo is null) return null;

        if (patch.Title is not null) todo.Title = patch.Title.Trim();
        if (patch.Done is not null) todo.Done = patch.Done.Value;
        todo.UpdatedAt = time.GetUtcNow();

        await db.SaveChangesAsync(ct);   // el change tracker genera el UPDATE solo con lo que cambió
        return ToDto(todo);
    }

    public async Task<bool> DeleteAsync(int id, CancellationToken ct) =>
        await db.Todos.Where(t => t.Id == id).ExecuteDeleteAsync(ct) == 1;

    private static TodoDto ToDto(Todo t) => new(t.Id, t.Title, t.Done);
}
