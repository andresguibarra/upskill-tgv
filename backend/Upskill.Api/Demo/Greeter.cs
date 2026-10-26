using Microsoft.Extensions.Options;

namespace Upskill.Api.Demo;

public interface IGreeter
{
    string Greet(string name);
}

// Constructor principal (C# 12): las dependencias llegan por DI.
public sealed class Greeter(IOptions<GreetingOptions> options, TimeProvider time) : IGreeter
{
    public string Greet(string name) =>
        $"{options.Value.Prefix}, {name} ({time.GetLocalNow():HH:mm})";
}
