using Microsoft.Data.Sqlite;
using Microsoft.EntityFrameworkCore;
using Upskill.Api.Data;

namespace Upskill.Api.Tests.Unit;

// SQLite en memoria: base real (constraints, SQL de verdad) que vive mientras la conexión esté abierta.
public sealed class SqliteDb : IDisposable
{
    private readonly SqliteConnection _connection = new("Data Source=:memory:");

    public SqliteDb()
    {
        _connection.Open();
        using var db = CreateContext();
        db.Database.EnsureCreated();
    }

    // Un contexto nuevo por operación, como en la app (uno por request): evita que el change tracker "ayude".
    public AppDbContext CreateContext() =>
        new(new DbContextOptionsBuilder<AppDbContext>().UseSqlite(_connection).Options);

    public void Dispose() => _connection.Dispose();
}
