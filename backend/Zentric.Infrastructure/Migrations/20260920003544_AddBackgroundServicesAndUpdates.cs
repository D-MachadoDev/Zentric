using System;
using System.Collections.Generic;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Zentric.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddBackgroundServicesAndUpdates : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "OrderItem");

            migrationBuilder.DropTable(
                name: "Shipment");

            migrationBuilder.DropTable(
                name: "VariantAttribute");

            migrationBuilder.DropTable(
                name: "ProductVariant");

            migrationBuilder.DropColumn(
                name: "VendorId",
                table: "Invoices");

            migrationBuilder.DropColumn(
                name: "DeletedAt",
                table: "Inventories");

            migrationBuilder.DropColumn(
                name: "AdditionalAddresses",
                table: "Buyers");

            migrationBuilder.RenameColumn(
                name: "FullName_LastName",
                table: "Users",
                newName: "LastName");

            migrationBuilder.RenameColumn(
                name: "FullName_FirstName",
                table: "Users",
                newName: "FirstName");

            migrationBuilder.RenameColumn(
                name: "Price_Currency",
                table: "Products",
                newName: "PriceCurrency");

            migrationBuilder.RenameColumn(
                name: "Price_Amount",
                table: "Products",
                newName: "PriceAmount");

            migrationBuilder.RenameColumn(
                name: "TotalAmount_Currency",
                table: "Invoices",
                newName: "Currency");

            migrationBuilder.RenameColumn(
                name: "TotalAmount_Amount",
                table: "Invoices",
                newName: "TotalAmount");

            migrationBuilder.AddColumn<string>(
                name: "IdentityDocument",
                table: "Users",
                type: "text",
                nullable: false,
                defaultValue: "");

            migrationBuilder.AddColumn<Guid>(
                name: "WarehouseId",
                table: "ReturnRequests",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));

            migrationBuilder.AddColumn<string>(
                name: "CancellationReason",
                table: "FulfillmentOrders",
                type: "text",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "OrderItemDbModel",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    CustomerOrderId = table.Column<Guid>(type: "uuid", nullable: false),
                    VariantId = table.Column<Guid>(type: "uuid", nullable: false),
                    Quantity = table.Column<int>(type: "integer", nullable: false),
                    UnitPriceAmount = table.Column<decimal>(type: "numeric", nullable: false),
                    UnitPriceCurrency = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_OrderItemDbModel", x => x.Id);
                    table.ForeignKey(
                        name: "FK_OrderItemDbModel_CustomerOrders_CustomerOrderId",
                        column: x => x.CustomerOrderId,
                        principalTable: "CustomerOrders",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ProductVariantDbModel",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ProductId = table.Column<Guid>(type: "uuid", nullable: false),
                    Sku = table.Column<string>(type: "text", nullable: false),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProductVariantDbModel", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ProductVariantDbModel_Products_ProductId",
                        column: x => x.ProductId,
                        principalTable: "Products",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ShipmentDbModel",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    FulfillmentOrderId = table.Column<Guid>(type: "uuid", nullable: false),
                    WarehouseId = table.Column<Guid>(type: "uuid", nullable: false),
                    TrackingNumber = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ShipmentDbModel", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ShipmentDbModel_FulfillmentOrders_FulfillmentOrderId",
                        column: x => x.FulfillmentOrderId,
                        principalTable: "FulfillmentOrders",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "VariantAttributeDbModel",
                columns: table => new
                {
                    Name = table.Column<string>(type: "text", nullable: false),
                    VariantId = table.Column<Guid>(type: "uuid", nullable: false),
                    Value = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_VariantAttributeDbModel", x => new { x.VariantId, x.Name });
                    table.ForeignKey(
                        name: "FK_VariantAttributeDbModel_ProductVariantDbModel_VariantId",
                        column: x => x.VariantId,
                        principalTable: "ProductVariantDbModel",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_OrderItemDbModel_CustomerOrderId",
                table: "OrderItemDbModel",
                column: "CustomerOrderId");

            migrationBuilder.CreateIndex(
                name: "IX_ProductVariantDbModel_ProductId",
                table: "ProductVariantDbModel",
                column: "ProductId");

            migrationBuilder.CreateIndex(
                name: "IX_ShipmentDbModel_FulfillmentOrderId",
                table: "ShipmentDbModel",
                column: "FulfillmentOrderId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "OrderItemDbModel");

            migrationBuilder.DropTable(
                name: "ShipmentDbModel");

            migrationBuilder.DropTable(
                name: "VariantAttributeDbModel");

            migrationBuilder.DropTable(
                name: "ProductVariantDbModel");

            migrationBuilder.DropColumn(
                name: "IdentityDocument",
                table: "Users");

            migrationBuilder.DropColumn(
                name: "WarehouseId",
                table: "ReturnRequests");

            migrationBuilder.DropColumn(
                name: "CancellationReason",
                table: "FulfillmentOrders");

            migrationBuilder.RenameColumn(
                name: "LastName",
                table: "Users",
                newName: "FullName_LastName");

            migrationBuilder.RenameColumn(
                name: "FirstName",
                table: "Users",
                newName: "FullName_FirstName");

            migrationBuilder.RenameColumn(
                name: "PriceCurrency",
                table: "Products",
                newName: "Price_Currency");

            migrationBuilder.RenameColumn(
                name: "PriceAmount",
                table: "Products",
                newName: "Price_Amount");

            migrationBuilder.RenameColumn(
                name: "TotalAmount",
                table: "Invoices",
                newName: "TotalAmount_Amount");

            migrationBuilder.RenameColumn(
                name: "Currency",
                table: "Invoices",
                newName: "TotalAmount_Currency");

            migrationBuilder.AddColumn<Guid>(
                name: "VendorId",
                table: "Invoices",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "DeletedAt",
                table: "Inventories",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<List<string>>(
                name: "AdditionalAddresses",
                table: "Buyers",
                type: "text[]",
                nullable: false);

            migrationBuilder.CreateTable(
                name: "OrderItem",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    CustomerOrderId = table.Column<Guid>(type: "uuid", nullable: false),
                    Quantity = table.Column<int>(type: "integer", nullable: false),
                    VariantId = table.Column<Guid>(type: "uuid", nullable: false),
                    UnitPrice_Amount = table.Column<decimal>(type: "numeric", nullable: false),
                    UnitPrice_Currency = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_OrderItem", x => x.Id);
                    table.ForeignKey(
                        name: "FK_OrderItem_CustomerOrders_CustomerOrderId",
                        column: x => x.CustomerOrderId,
                        principalTable: "CustomerOrders",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "ProductVariant",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    DeletedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    IsActive = table.Column<bool>(type: "boolean", nullable: false),
                    ProductId = table.Column<Guid>(type: "uuid", nullable: false),
                    Sku = table.Column<string>(type: "text", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_ProductVariant", x => x.Id);
                    table.ForeignKey(
                        name: "FK_ProductVariant_Products_ProductId",
                        column: x => x.ProductId,
                        principalTable: "Products",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "Shipment",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    FulfillmentOrderId = table.Column<Guid>(type: "uuid", nullable: false),
                    TrackingNumber = table.Column<string>(type: "text", nullable: false),
                    WarehouseId = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Shipment", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Shipment_FulfillmentOrders_FulfillmentOrderId",
                        column: x => x.FulfillmentOrderId,
                        principalTable: "FulfillmentOrders",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "VariantAttribute",
                columns: table => new
                {
                    VariantId = table.Column<Guid>(type: "uuid", nullable: false),
                    Name = table.Column<string>(type: "text", nullable: false),
                    Value = table.Column<string>(type: "text", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_VariantAttribute", x => new { x.VariantId, x.Name });
                    table.ForeignKey(
                        name: "FK_VariantAttribute_ProductVariant_VariantId",
                        column: x => x.VariantId,
                        principalTable: "ProductVariant",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_OrderItem_CustomerOrderId",
                table: "OrderItem",
                column: "CustomerOrderId");

            migrationBuilder.CreateIndex(
                name: "IX_ProductVariant_ProductId",
                table: "ProductVariant",
                column: "ProductId");

            migrationBuilder.CreateIndex(
                name: "IX_Shipment_FulfillmentOrderId",
                table: "Shipment",
                column: "FulfillmentOrderId");
        }
    }
}
