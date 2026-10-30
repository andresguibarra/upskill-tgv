using System.ComponentModel.DataAnnotations;
using Upskill.Api.Todos;

namespace Upskill.Api.Tests.Unit;

// Los mismos DataAnnotations que usa AddValidation(), probados sin levantar HTTP.
public sealed class TodoValidationTests
{
    private static string[] Errors(object model)
    {
        var results = new List<ValidationResult>();
        Validator.TryValidateObject(model, new ValidationContext(model), results, validateAllProperties: true);
        return [.. results.SelectMany(r => r.MemberNames)];
    }

    // TheoryData<T>: datos tipados para un Theory (en vez de object[] de MemberData).
    public static TheoryData<CreateTodo, bool> Creates => new()
    {
        { new CreateTodo("Ok"), true },
        { new CreateTodo(""), false },
        { new CreateTodo(new string('x', 101)), false },
    };

    [Theory]
    [MemberData(nameof(Creates))]
    public void CreateTodo_valida_el_titulo(CreateTodo input, bool valid) =>
        Assert.Equal(valid, Errors(input).Length == 0);

    [Theory]
    [InlineData(null, true)]      // null = no tocar
    [InlineData("Nuevo", true)]
    [InlineData("   ", false)]    // solo espacios
    public void PatchTodo_acepta_null_pero_no_un_titulo_vacio(string? title, bool valid) =>
        Assert.Equal(valid, Errors(new PatchTodo(title, null)).Length == 0);
}
