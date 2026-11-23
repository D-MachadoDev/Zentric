using System;
using System.IO;
using Xunit;

namespace Zentric.Tests.Security
{
    /// <summary>
    /// Pruebas unitarias para el cargador automático de variables de entorno de Program (.env loader).
    /// Valida que se carguen valores de archivos .env sin sobrescribir variables existentes del sistema operativo o contenedor.
    /// </summary>
    public class EnvironmentLoaderTests
    {
        [Fact(DisplayName = "1. Carga segura de .env: Carga variables nuevas ignorando comentarios y líneas vacías")]
        public void LoadEnvironmentFile_WhenVariablesNotSet_LoadsThemCorrectly()
        {
            var tempFile = Path.GetTempFileName();
            try
            {
                var content = @"
# Comentario de prueba
TEST_RESEND_KEY=re_1234567890_test
TEST_RESEND_FROM=""Zentric <soporte@zentric.me>""
TEST_QUOTED_SINGLE='single_quoted_val'
EMPTY_LINE=

";
                File.WriteAllText(tempFile, content);

                Environment.SetEnvironmentVariable("TEST_RESEND_KEY", null);
                Environment.SetEnvironmentVariable("TEST_RESEND_FROM", null);
                Environment.SetEnvironmentVariable("TEST_QUOTED_SINGLE", null);

                Program.LoadEnvironmentFile(tempFile, overwrite: false);

                Assert.Equal("re_1234567890_test", Environment.GetEnvironmentVariable("TEST_RESEND_KEY"));
                Assert.Equal("Zentric <soporte@zentric.me>", Environment.GetEnvironmentVariable("TEST_RESEND_FROM"));
                Assert.Equal("single_quoted_val", Environment.GetEnvironmentVariable("TEST_QUOTED_SINGLE"));
            }
            finally
            {
                if (File.Exists(tempFile)) File.Delete(tempFile);
                Environment.SetEnvironmentVariable("TEST_RESEND_KEY", null);
                Environment.SetEnvironmentVariable("TEST_RESEND_FROM", null);
                Environment.SetEnvironmentVariable("TEST_QUOTED_SINGLE", null);
            }
        }

        [Fact(DisplayName = "2. No sobreescritura: Respeta variables de entorno preexistentes del sistema operativo o contenedor")]
        public void LoadEnvironmentFile_WhenVariableAlreadyExists_DoesNotOverwrite()
        {
            var tempFile = Path.GetTempFileName();
            try
            {
                var content = "TEST_PREEXISTING_KEY=new_file_value";
                File.WriteAllText(tempFile, content);

                Environment.SetEnvironmentVariable("TEST_PREEXISTING_KEY", "system_original_value");

                Program.LoadEnvironmentFile(tempFile, overwrite: false);

                Assert.Equal("system_original_value", Environment.GetEnvironmentVariable("TEST_PREEXISTING_KEY"));
            }
            finally
            {
                if (File.Exists(tempFile)) File.Delete(tempFile);
                Environment.SetEnvironmentVariable("TEST_PREEXISTING_KEY", null);
            }
        }
    }
}
