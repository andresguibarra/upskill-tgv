using Microsoft.EntityFrameworkCore;

namespace Upskill.Api.Data;

public sealed class Note
{
    public int Id { get; set; }
    public required string Title { get; set; }
    public bool Pinned { get; set; }
    public DateTimeOffset CreatedAt { get; set; }
}

public sealed class AppDbContext(DbContextOptions<AppDbContext> options) : DbContext(options)
{
    public DbSet<Note> Notes => Set<Note>();

    protected override void OnModelCreating(ModelBuilder model)
    {
        // Fluent API: reglas del modelo que terminan en la migración.
        model.Entity<Note>(e =>
        {
            e.Property(n => n.Title).HasMaxLength(100);
            e.HasIndex(n => n.Title).IsUnique();
        });
    }
}
