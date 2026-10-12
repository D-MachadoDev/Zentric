using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Zentric.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class SplitBuyerAddressIntoColumns : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "MainAddress",
                table: "Buyers",
                newName: "MainAddressZipCode");

            migrationBuilder.AddColumn<string>(
                name: "MainAddressCity",
                table: "Buyers",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "MainAddressCountry",
                table: "Buyers",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "MainAddressState",
                table: "Buyers",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<string>(
                name: "MainAddressStreet",
                table: "Buyers",
                type: "text",
                nullable: false,
                defaultValue: "");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "MainAddressCity",
                table: "Buyers");

            migrationBuilder.DropColumn(
                name: "MainAddressCountry",
                table: "Buyers");

            migrationBuilder.DropColumn(
                name: "MainAddressState",
                table: "Buyers");

            migrationBuilder.DropColumn(
                name: "MainAddressStreet",
                table: "Buyers");

            migrationBuilder.RenameColumn(
                name: "MainAddressZipCode",
                table: "Buyers",
                newName: "MainAddress");
        }
    }
}
