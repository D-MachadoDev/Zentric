using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Zentric.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddBuyerFavorites : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "buyer_favorites",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    UserId = table.Column<Guid>(type: "uuid", nullable: false),
                    ProductId = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_buyer_favorites", x => x.Id);
                    table.ForeignKey(
                        name: "FK_buyer_favorites_Products_ProductId",
                        column: x => x.ProductId,
                        principalTable: "Products",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_buyer_favorites_CreatedAt",
                table: "buyer_favorites",
                column: "CreatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_buyer_favorites_ProductId",
                table: "buyer_favorites",
                column: "ProductId");

            migrationBuilder.CreateIndex(
                name: "IX_buyer_favorites_UserId",
                table: "buyer_favorites",
                column: "UserId");

            migrationBuilder.CreateIndex(
                name: "IX_buyer_favorites_UserId_ProductId",
                table: "buyer_favorites",
                columns: new[] { "UserId", "ProductId" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "buyer_favorites");
        }
    }
}
