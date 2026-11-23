using PdfSharp.Fonts;

namespace Zentric.Application.Billing.Pdf;

/// <summary>
/// Resolver de fuentes que mapea los nombres de fuente de Windows usados en las
/// facturas ("Arial", "Courier New") a fuentes realmente disponibles en el
/// sistema operativo:
///  - Linux (CI y Render): Liberation Sans / Liberation Mono (paquete fonts-liberation).
///  - Windows: Arial / Courier New.
///
/// Existe para evitar el <c>NullReferenceException</c> de PdfSharp 6 al generar
/// PDFs en Linux, donde los resolvers integrados no encuentran "Arial".
/// </summary>
internal sealed class SystemFontResolver : IFontResolver
{
    private const string RegularFace = "zentric-regular";
    private const string BoldFace = "zentric-bold";
    private const string MonoFace = "zentric-mono";

    public FontResolverInfo? ResolveTypeface(string familyName, bool isBold, bool isItalic)
    {
        var isMono = familyName.Contains("Courier", StringComparison.OrdinalIgnoreCase)
                     || familyName.Contains("Mono", StringComparison.OrdinalIgnoreCase);

        var face = isMono ? MonoFace : (isBold ? BoldFace : RegularFace);
        return new FontResolverInfo(face);
    }

    public byte[]? GetFont(string faceName) => faceName switch
    {
        BoldFace => LoadFirst("LiberationSans-Bold.ttf", "arialbd.ttf", "DejaVuSans-Bold.ttf"),
        MonoFace => LoadFirst("LiberationMono-Regular.ttf", "cour.ttf", "DejaVuSansMono.ttf"),
        _ => LoadFirst("LiberationSans-Regular.ttf", "arial.ttf", "DejaVuSans.ttf"),
    };

    private static byte[]? LoadFirst(params string[] fileNames)
    {
        foreach (var dir in CandidateDirectories())
        {
            foreach (var name in fileNames)
            {
                var path = Path.Combine(dir, name);
                if (!File.Exists(path)) continue;

                try
                {
                    return File.ReadAllBytes(path);
                }
                catch (IOException)
                {
                    // Archivo bloqueado o ilegible: probamos el siguiente.
                }
                catch (UnauthorizedAccessException)
                {
                }
            }
        }

        return null;
    }

    private static IEnumerable<string> CandidateDirectories()
    {
        // Linux (CI y contenedor de Render).
        yield return "/usr/share/fonts/truetype/liberation";
        yield return "/usr/share/fonts/truetype/liberation2";
        yield return "/usr/share/fonts/truetype/dejavu";
        yield return "/usr/share/fonts/truetype/msttcorefonts";

        // Windows (desarrollo local).
        yield return Environment.GetFolderPath(Environment.SpecialFolder.Fonts);
        yield return @"C:\Windows\Fonts";
    }
}
