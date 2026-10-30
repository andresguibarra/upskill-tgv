using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Mvc;
using Upskill.Api.Todos;

namespace Upskill.Api.Tests.Integration;

// Una factory (y una base) nueva por test: los tests no comparten estado y pueden correr en cualquier orden.
public sealed class TodosApiTests : IAsyncDisposable
{
    private readonly ApiFactory _factory = new();
    private readonly HttpClient _client;
    private readonly CancellationToken _ct = TestContext.Current.CancellationToken;

    public TodosApiTests() => _client = _factory.CreateClient();

    public ValueTask DisposeAsync() => _factory.DisposeAsync();

    private async Task<TodoDto> Create(string title, bool done = false)
    {
        var res = await _client.PostAsJsonAsync("/api/todos", new { title, done }, _ct);
        res.EnsureSuccessStatusCode();
        return (await res.Content.ReadFromJsonAsync<TodoDto>(_ct))!;
    }

    [Fact]
    public async Task Post_devuelve_201_con_Location_y_el_recurso()
    {
        var res = await _client.PostAsJsonAsync("/api/todos", new { title = " Integración " }, _ct);

        Assert.Equal(HttpStatusCode.Created, res.StatusCode);
        var todo = await res.Content.ReadFromJsonAsync<TodoDto>(_ct);
        Assert.Equal(new TodoDto(1, "Integración", false), todo);
        Assert.Equal("/api/todos/1", res.Headers.Location?.AbsolutePath);

        var fetched = await _client.GetFromJsonAsync<TodoDto>(res.Headers.Location, _ct);
        Assert.Equal(todo, fetched);
    }

    [Fact]
    public async Task Post_invalido_devuelve_400_con_ProblemDetails()
    {
        var res = await _client.PostAsJsonAsync("/api/todos", new { title = "" }, _ct);

        Assert.Equal(HttpStatusCode.BadRequest, res.StatusCode);
        Assert.Equal("application/problem+json", res.Content.Headers.ContentType?.MediaType);
        var problem = await res.Content.ReadFromJsonAsync<ValidationProblemDetails>(_ct);
        Assert.Contains("Title", problem!.Errors.Keys);
    }

    [Fact]
    public async Task Get_filtra_por_done_desde_el_query()
    {
        await Create("pendiente");
        await Create("hecha", done: true);

        var done = await _client.GetFromJsonAsync<List<TodoDto>>("/api/todos?done=true", _ct);

        Assert.Equal(["hecha"], done!.Select(t => t.Title));
    }

    [Fact]
    public async Task Patch_actualiza_y_un_id_inexistente_da_404()
    {
        var todo = await Create("Original");

        var ok = await _client.PatchAsJsonAsync($"/api/todos/{todo.Id}", new { done = true }, _ct);
        var missing = await _client.PatchAsJsonAsync("/api/todos/999", new { done = true }, _ct);

        Assert.Equal(todo with { Done = true }, await ok.Content.ReadFromJsonAsync<TodoDto>(_ct));
        Assert.Equal(HttpStatusCode.NotFound, missing.StatusCode);
    }

    [Fact]
    public async Task Delete_devuelve_204_y_despues_404()
    {
        var todo = await Create("Borrar");

        Assert.Equal(HttpStatusCode.NoContent, (await _client.DeleteAsync($"/api/todos/{todo.Id}", _ct)).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await _client.DeleteAsync($"/api/todos/{todo.Id}", _ct)).StatusCode);
    }
}
