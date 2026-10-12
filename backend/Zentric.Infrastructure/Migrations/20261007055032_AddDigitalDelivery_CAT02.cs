using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Zentric.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddDigitalDelivery_CAT02 : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "DeliveredAt",
                table: "OrderItemDbModel",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "DigitalDeliveries",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    OrderId = table.Column<Guid>(type: "uuid", nullable: false),
                    OrderItemId = table.Column<Guid>(type: "uuid", nullable: false),
                    ProductId = table.Column<Guid>(type: "uuid", nullable: false),
                    VariantId = table.Column<Guid>(type: "uuid", nullable: false),
                    ProductName = table.Column<string>(type: "text", nullable: false),
                    VariantSku = table.Column<string>(type: "text", nullable: false),
                    DeliveredAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    DeliveredBy = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_DigitalDeliveries", x => x.Id);
                    table.ForeignKey(
                        name: "FK_DigitalDeliveries_CustomerOrders_OrderId",
                        column: x => x.OrderId,
                        principalTable: "CustomerOrders",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_DigitalDeliveries_OrderId",
                table: "DigitalDeliveries",
                column: "OrderId");

            migrationBuilder.CreateIndex(
                name: "IX_DigitalDeliveries_OrderItemId",
                table: "DigitalDeliveries",
                column: "OrderItemId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "DigitalDeliveries");

            migrationBuilder.DropColumn(
                name: "DeliveredAt",
                table: "OrderItemDbModel");
        }
    }
}
