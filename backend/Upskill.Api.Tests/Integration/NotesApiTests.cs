using System.Net;
using System.Net.Http.Json;
using Upskill.Api.Practica;

namespace Upskill.Api.Tests.Integration;

public sealed class NotesApiTests : IAsyncDisposable
{
    private readonly ApiFactory _factory = new();
    private readonly HttpClient _client;
    private readonly CancellationToken _ct = TestContext.Current.CancellationToken;

    public NotesApiTests() => _client = _factory.CreateClient();

    public ValueTask DisposeAsync() => _factory.DisposeAsync();

    private async Task<NoteDto> Create(string title) =>
        (await (await _client.PostAsJsonAsync("/api/notes", new { title }, _ct)).Content.ReadFromJsonAsync<NoteDto>(_ct))!;

    [Fact]
    public async Task List_pone_primero_las_fijadas_pagina_y_busca()
    {
        // 5 requests justas: el grupo /api/notes tiene rate limit de 5 cada 10 segundos.
        await Create("EF Core");
        var middleware = await Create("Middleware");
        await _client.PutAsync($"/api/notes/{middleware.Id}/pin", null, _ct);

        var firstPage = await _client.GetFromJsonAsync<List<NoteDto>>("/api/notes?page=1&pageSize=1", _ct);
        var search = await _client.GetFromJsonAsync<List<NoteDto>>("/api/notes?search=Core", _ct);

        Assert.Equal(["Middleware"], firstPage!.Select(n => n.Title));   // la fijada va primero
        Assert.Equal(["EF Core"], search!.Select(n => n.Title));
    }

    [Fact]
    public async Task Pin_alterna_y_un_id_inexistente_da_404()
    {
        var note = await Create("Fijar");

        await _client.PutAsync($"/api/notes/{note.Id}/pin", null, _ct);
        await _client.PutAsync($"/api/notes/{note.Id}/pin", null, _ct);
        var missing = await _client.PutAsync("/api/notes/999/pin", null, _ct);

        var list = await _client.GetFromJsonAsync<List<NoteDto>>("/api/notes", _ct);
        Assert.False(list!.Single().Pinned);
        Assert.Equal(HttpStatusCode.NotFound, missing.StatusCode);
    }

    [Fact]
    public async Task Delete_devuelve_204_y_despues_404()
    {
        var note = await Create("Borrar");

        Assert.Equal(HttpStatusCode.NoContent, (await _client.DeleteAsync($"/api/notes/{note.Id}", _ct)).StatusCode);
        Assert.Equal(HttpStatusCode.NotFound, (await _client.DeleteAsync($"/api/notes/{note.Id}", _ct)).StatusCode);
    }

    [Fact]
    public async Task El_rate_limiter_corta_con_429_despues_de_5_requests()
    {
        var codes = new List<HttpStatusCode>();
        for (var i = 0; i < 6; i++)
            codes.Add((await _client.GetAsync("/api/notes", _ct)).StatusCode);

        Assert.Equal(Enumerable.Repeat(HttpStatusCode.OK, 5).Append(HttpStatusCode.TooManyRequests), codes);
    }
}
