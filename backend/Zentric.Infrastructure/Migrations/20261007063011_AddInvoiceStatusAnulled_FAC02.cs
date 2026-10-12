using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Zentric.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddInvoiceStatusAnulled_FAC02 : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "AnulledAt",
                table: "Invoices",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "AnulledReason",
                table: "Invoices",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "Status",
                table: "Invoices",
                type: "integer",
                nullable: false,
                defaultValue: 0);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AnulledAt",
                table: "Invoices");

            migrationBuilder.DropColumn(
                name: "AnulledReason",
                table: "Invoices");

            migrationBuilder.DropColumn(
                name: "Status",
                table: "Invoices");
        }
    }
}
