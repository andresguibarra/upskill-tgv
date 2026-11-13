using Microsoft.Extensions.Time.Testing;
using Upskill.Api.Todos;

namespace Upskill.Api.Tests.Unit;

// xUnit crea una instancia de la clase por test: el constructor es el "setup" y Dispose el "teardown".
public sealed class TodoServiceTests : IDisposable
{
    private readonly SqliteDb _db = new();
    private readonly FakeTimeProvider _time = new(new DateTimeOffset(2026, 10, 29, 12, 0, 0, TimeSpan.Zero));
    private readonly CancellationToken _ct = TestContext.Current.CancellationToken;

    private TodoService Service() => new(_db.CreateContext(), _time);

    public void Dispose() => _db.Dispose();

    [Fact]
    public async Task Create_recorta_el_titulo_y_guarda_las_fechas()
    {
        var created = await Service().CreateAsync(new CreateTodo("  Repasar xUnit  "), _ct);

        Assert.Equal("Repasar xUnit", created.Title);
        Assert.False(created.Done);

        var row = await _db.CreateContext().Todos.FindAsync([created.Id], _ct);
        Assert.NotNull(row);
        Assert.Equal(_time.GetUtcNow(), row.CreatedAt);
        Assert.Equal(row.CreatedAt, row.UpdatedAt);
    }

    [Theory]
    [InlineData(null, 3)]
    [InlineData(true, 1)]
    [InlineData(false, 2)]
    public async Task List_filtra_por_done(bool? done, int expected)
    {
        var svc = Service();
        await svc.CreateAsync(new CreateTodo("a"), _ct);
        await svc.CreateAsync(new CreateTodo("b", Done: true), _ct);
        await svc.CreateAsync(new CreateTodo("c"), _ct);

        var list = await Service().ListAsync(done, _ct);

        Assert.Equal(expected, list.Count);
        Assert.All(list, t => Assert.True(done is null || t.Done == done));
    }

    [Fact]
    public async Task Patch_cambia_solo_lo_que_viene_y_actualiza_UpdatedAt()
    {
        var created = await Service().CreateAsync(new CreateTodo("Original"), _ct);
        _time.Advance(TimeSpan.FromMinutes(5));

        var patched = await Service().PatchAsync(created.Id, new PatchTodo(Title: null, Done: true), _ct);

        Assert.Equal(created with { Done = true }, patched);   // records: igualdad por valor
        var row = await _db.CreateContext().Todos.FindAsync([created.Id], _ct);
        Assert.Equal(TimeSpan.FromMinutes(5), row!.UpdatedAt - row.CreatedAt);
    }

    [Fact]
    public async Task Patch_de_un_id_inexistente_devuelve_null()
    {
        Assert.Null(await Service().PatchAsync(99, new PatchTodo("x", null), _ct));
    }

    [Fact]
    public async Task Delete_borra_una_sola_vez()
    {
        var created = await Service().CreateAsync(new CreateTodo("Borrar"), _ct);

        Assert.True(await Service().DeleteAsync(created.Id, _ct));
        Assert.False(await Service().DeleteAsync(created.Id, _ct));
        Assert.Null(await Service().FindAsync(created.Id, _ct));
    }

    [Fact]
    public async Task Stats_cuenta_total_hechas_y_pendientes()
    {
        var svc = Service();
        await svc.CreateAsync(new CreateTodo("a"), _ct);
        await svc.CreateAsync(new CreateTodo("b", Done: true), _ct);
        await svc.CreateAsync(new CreateTodo("c"), _ct);

        Assert.Equal(new TodoStats(Total: 3, Done: 1, Pending: 2), await Service().StatsAsync(_ct));
    }

    [Fact]
    public async Task Stats_sin_todos_devuelve_ceros()
    {
        Assert.Equal(new TodoStats(0, 0, 0), await Service().StatsAsync(_ct));
    }
}
