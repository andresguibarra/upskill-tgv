using Microsoft.Extensions.Options;
using Microsoft.Extensions.Time.Testing;
using Upskill.Api.Demo;

namespace Upskill.Api.Tests.Unit;

public sealed class GreeterTests
{
    [Fact]
    public void Greet_usa_el_prefijo_de_las_options_y_la_hora_del_TimeProvider()
    {
        // Sin librería de mocks: Options.Create y FakeTimeProvider son dobles de prueba listos.
        var time = new FakeTimeProvider(new DateTimeOffset(2026, 10, 29, 9, 30, 0, TimeSpan.Zero));
        time.SetLocalTimeZone(TimeZoneInfo.Utc);
        var greeter = new Greeter(Options.Create(new GreetingOptions { Prefix = "Buenas" }), time);

        Assert.Equal("Buenas, Andres (09:30)", greeter.Greet("Andres"));
    }
}
