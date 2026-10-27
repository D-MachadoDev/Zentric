using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Zentric.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddDeletedAtToInventories : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // La eliminacion logica ya existia en el dominio pero nunca llego a la
            // tabla: el DELETE respondia 200 y la fila seguia apareciendo.
            migrationBuilder.AddColumn<DateTime>(
                name: "DeletedAt",
                table: "Inventories",
                type: "timestamp with time zone",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "DeletedAt",
                table: "Inventories");
        }
    }
}
