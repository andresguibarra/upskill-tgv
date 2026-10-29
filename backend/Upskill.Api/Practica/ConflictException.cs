using Microsoft.AspNetCore.Diagnostics;

namespace Upskill.Api.Practica;

public sealed class ConflictException(string message) : Exception(message);

// IExceptionHandler: traduce una excepción propia a un status code. Si devuelve false, sigue el handler por defecto (500).
public sealed class ConflictExceptionHandler(IProblemDetailsService problemDetails) : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(HttpContext http, Exception exception, CancellationToken ct)
    {
        if (exception is not ConflictException conflict) return false;

        http.Response.StatusCode = StatusCodes.Status409Conflict;
        return await problemDetails.TryWriteAsync(new()
        {
            HttpContext = http,
            Exception = exception,
            ProblemDetails = { Title = "Conflicto", Detail = conflict.Message },
        });
    }
}
