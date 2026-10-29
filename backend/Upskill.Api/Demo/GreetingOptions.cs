using System.ComponentModel.DataAnnotations;

namespace Upskill.Api.Demo;

public sealed class GreetingOptions
{
    public const string Section = "Greeting";

    [Required, StringLength(20, MinimumLength = 1)]
    public string Prefix { get; init; } = "Hola";
}
