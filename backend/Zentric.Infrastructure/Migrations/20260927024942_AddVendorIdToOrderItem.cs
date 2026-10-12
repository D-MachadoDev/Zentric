using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Zentric.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddVendorIdToOrderItem : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Q-18 (dictamen del Owner): la linea del pedido guarda el VendorId
            // como instantanea historica del vendedor en el momento de la compra.
            //
            // ADVERTENCIA: las filas existentes reciben Guid.Empty porque no es
            // posible reconstruir el vendedor original sin volver a cruzar con
            // el producto. Si hay pedidos historicos en produccion, sus facturas
            // por vendedor no podran emitirse hasta que se haga backfill manual.
            // En un entorno nuevo (sin datos previos) esto no aplica.
            migrationBuilder.AddColumn<Guid>(
                name: "VendorId",
                table: "OrderItemDbModel",
                type: "uuid",
                nullable: false,
                defaultValue: new Guid("00000000-0000-0000-0000-000000000000"));
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "VendorId",
                table: "OrderItemDbModel");
        }
    }
}
