using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Mvc;
using Upskill.Api.Demo;

namespace Upskill.Api.Tests.Integration;

public sealed class ErrorsAndCorsTests(ApiFactory factory) : IClassFixture<ApiFactory>
{
    private readonly HttpClient _client = factory.CreateClient();
    private readonly CancellationToken _ct = TestContext.Current.CancellationToken;

    [Fact]
    public async Task Una_excepcion_no_manejada_da_500_sin_detalles_internos()
    {
        var res = await _client.GetAsync("/api/demo/boom", _ct);

        Assert.Equal(HttpStatusCode.InternalServerError, res.StatusCode);
        var body = await res.Content.ReadAsStringAsync(_ct);
        Assert.DoesNotContain("Algo salió mal", body);               // el mensaje de la excepción no se filtra
        Assert.Equal(500, (await res.Content.ReadFromJsonAsync<ProblemDetails>(_ct))!.Status);
    }

    [Theory]
    [InlineData("/api/no-existe", HttpStatusCode.NotFound)]
    [InlineData("/api/todos/abc", HttpStatusCode.NotFound)]          // la constraint {id:int} no matchea
    public async Task Las_rutas_que_no_matchean_devuelven_ProblemDetails(string url, HttpStatusCode expected)
    {
        var res = await _client.GetAsync(url, _ct);

        Assert.Equal(expected, res.StatusCode);
        Assert.Equal("application/problem+json", res.Content.Headers.ContentType?.MediaType);
    }

    [Fact]
    public async Task El_endpoint_filter_de_validacion_corta_antes_del_handler()
    {
        var bad = await _client.PostAsJsonAsync("/api/demo/items", new { name = "x" }, _ct);
        var ok = await _client.PostAsJsonAsync("/api/demo/items", new { name = " Libro " }, _ct);

        Assert.Equal(HttpStatusCode.BadRequest, bad.StatusCode);
        Assert.Contains("Name", (await bad.Content.ReadFromJsonAsync<ValidationProblemDetails>(_ct))!.Errors.Keys);
        Assert.Equal(HttpStatusCode.Created, ok.StatusCode);
        Assert.Equal("Libro", (await _client.GetFromJsonAsync<Item>(ok.Headers.Location, _ct))!.Name);
    }

    [Theory]
    [InlineData("http://localhost:5173", true)]
    [InlineData("https://evil.example", false)]
    public async Task CORS_solo_habilita_el_origen_del_frontend(string origin, bool allowed)
    {
        using var preflight = new HttpRequestMessage(HttpMethod.Options, "/api/todos");
        preflight.Headers.Add("Origin", origin);
        preflight.Headers.Add("Access-Control-Request-Method", "POST");

        var res = await _client.SendAsync(preflight, _ct);

        Assert.Equal(allowed, res.Headers.Contains("Access-Control-Allow-Origin"));
    }

    [Fact]
    public async Task OpenAPI_no_se_expone_fuera_de_Development()
    {
        Assert.Equal(HttpStatusCode.NotFound, (await _client.GetAsync("/openapi/v1.json", _ct)).StatusCode);
    }
}
