using Microsoft.AspNetCore.Http.HttpResults;
using Microsoft.EntityFrameworkCore;
using Upskill.Api.Data;

namespace Upskill.Api.Practica;

public sealed record NoteDto(int Id, string Title, bool Pinned);

public sealed record NewNote(string Title);

public sealed record NotesQuery(string? Search, int Page = 1, int PageSize = 10);

public static class NotesEndpoints
{
    public static IEndpointRouteBuilder MapNotesEndpoints(this IEndpointRouteBuilder app)
    {
        var notes = app.MapGroup("/api/notes")
            .WithTags("Notes")
            .RequireRateLimiting("fixed");

        // [AsParameters]: bindea el record desde el query (?search=&page=&pageSize=).
        notes.MapGet("/", async ([AsParameters] NotesQuery q, AppDbContext db, CancellationToken ct) =>
        {
            var query = db.Notes.AsNoTracking();
            if (!string.IsNullOrWhiteSpace(q.Search))
                query = query.Where(n => n.Title.Contains(q.Search));

            // Proyección con Select: el SQL trae solo las columnas del DTO.
            return TypedResults.Ok(await query
                .OrderByDescending(n => n.Pinned).ThenBy(n => n.Id)
                .Skip((q.Page - 1) * q.PageSize).Take(q.PageSize)
                .Select(n => new NoteDto(n.Id, n.Title, n.Pinned))
                .ToListAsync(ct));
        });

        notes.MapPost("/", async Task<Created<NoteDto>> (NewNote body, AppDbContext db, TimeProvider time, CancellationToken ct) =>
        {
            if (await db.Notes.AnyAsync(n => n.Title == body.Title, ct))
                throw new ConflictException($"Ya existe una nota \"{body.Title}\"");

            var note = new Note { Title = body.Title, CreatedAt = time.GetUtcNow() };
            db.Notes.Add(note);
            await db.SaveChangesAsync(ct);   // el change tracker genera el INSERT y completa note.Id
            return TypedResults.Created($"/api/notes/{note.Id}", new NoteDto(note.Id, note.Title, note.Pinned));
        });

        // ExecuteUpdate/ExecuteDelete: un UPDATE/DELETE directo, sin cargar la entidad.
        notes.MapPut("/{id:int}/pin", async Task<Results<NoContent, NotFound>> (int id, AppDbContext db, CancellationToken ct) =>
            await db.Notes.Where(n => n.Id == id)
                .ExecuteUpdateAsync(s => s.SetProperty(n => n.Pinned, n => !n.Pinned), ct) == 1
                ? TypedResults.NoContent() : TypedResults.NotFound());

        notes.MapDelete("/{id:int}", async Task<Results<NoContent, NotFound>> (int id, AppDbContext db, CancellationToken ct) =>
            await db.Notes.Where(n => n.Id == id).ExecuteDeleteAsync(ct) == 1
                ? TypedResults.NoContent() : TypedResults.NotFound());

        return app;
    }
}
