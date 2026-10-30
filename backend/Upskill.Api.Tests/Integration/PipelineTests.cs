using System.Net;
using System.Net.Http.Json;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.TestHost;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.DependencyInjection.Extensions;
using NSubstitute;
using Upskill.Api.Demo;

namespace Upskill.Api.Tests.Integration;

// IClassFixture: una sola factory para todos los tests de la clase (más rápido; ojo con el estado compartido).
public sealed class PipelineTests(ApiFactory factory) : IClassFixture<ApiFactory>
{
    private readonly CancellationToken _ct = TestContext.Current.CancellationToken;

    [Fact]
    public async Task Health_responde_Healthy_con_la_base_arriba()
    {
        var res = await factory.CreateClient().GetAsync("/health", _ct);

        Assert.Equal(HttpStatusCode.OK, res.StatusCode);
        Assert.Equal("Healthy", await res.Content.ReadAsStringAsync(_ct));
    }

    [Fact]
    public async Task ConflictException_se_traduce_a_409()
    {
        var client = factory.CreateClient();
        await client.PostAsJsonAsync("/api/notes", new { title = "Repetida" }, _ct);

        var res = await client.PostAsJsonAsync("/api/notes", new { title = "Repetida" }, _ct);

        Assert.Equal(HttpStatusCode.Conflict, res.StatusCode);
        Assert.Equal("Conflicto", (await res.Content.ReadFromJsonAsync<ProblemDetails>(_ct))!.Title);
    }

    [Fact]
    public async Task El_middleware_agrega_X_Elapsed_Ms()
    {
        var res = await factory.CreateClient().GetAsync("/api/todos", _ct);

        Assert.True(res.Headers.Contains("X-Elapsed-Ms"));
    }

    [Fact]
    public async Task Un_servicio_se_reemplaza_con_un_mock_de_NSubstitute()
    {
        var greeter = Substitute.For<IGreeter>();
        greeter.Greet("Andres").Returns("hola desde el mock");

        // WithWebHostBuilder: una variante de la factory solo para este test.
        var client = factory.WithWebHostBuilder(b => b.ConfigureTestServices(s =>
        {
            s.RemoveAll<IGreeter>();
            s.AddScoped(_ => greeter);
        })).CreateClient();

        var body = await client.GetFromJsonAsync<Dictionary<string, string>>("/api/demo/hello/Andres", _ct);

        Assert.Equal("hola desde el mock", body!["message"]);
        greeter.Received(1).Greet("Andres");
    }
}
