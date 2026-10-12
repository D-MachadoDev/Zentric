using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Zentric.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddStockAdjustments : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "StockAdjustments",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    InventoryId = table.Column<Guid>(type: "uuid", nullable: false),
                    SystemQuantity = table.Column<int>(type: "integer", nullable: false),
                    PhysicalQuantity = table.Column<int>(type: "integer", nullable: false),
                    CountedBy = table.Column<Guid>(type: "uuid", nullable: false),
                    Reason = table.Column<string>(type: "text", nullable: false),
                    CountedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_StockAdjustments", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_StockAdjustments_CountedBy",
                table: "StockAdjustments",
                column: "CountedBy");

            migrationBuilder.CreateIndex(
                name: "IX_StockAdjustments_InventoryId",
                table: "StockAdjustments",
                column: "InventoryId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "StockAdjustments");
        }
    }
}
