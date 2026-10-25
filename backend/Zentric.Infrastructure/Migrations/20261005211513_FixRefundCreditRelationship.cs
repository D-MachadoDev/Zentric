using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Zentric.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class FixRefundCreditRelationship : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_RefundCredits_PaymentReceipts_PaymentReceiptDbModelId",
                table: "RefundCredits");

            migrationBuilder.DropIndex(
                name: "IX_RefundCredits_PaymentReceiptDbModelId",
                table: "RefundCredits");

            migrationBuilder.DropColumn(
                name: "PaymentReceiptDbModelId",
                table: "RefundCredits");

            migrationBuilder.AddForeignKey(
                name: "FK_RefundCredits_PaymentReceipts_PaymentReceiptId",
                table: "RefundCredits",
                column: "PaymentReceiptId",
                principalTable: "PaymentReceipts",
                principalColumn: "Id",
                onDelete: ReferentialAction.Cascade);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_RefundCredits_PaymentReceipts_PaymentReceiptId",
                table: "RefundCredits");

            migrationBuilder.AddColumn<Guid>(
                name: "PaymentReceiptDbModelId",
                table: "RefundCredits",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_RefundCredits_PaymentReceiptDbModelId",
                table: "RefundCredits",
                column: "PaymentReceiptDbModelId");

            migrationBuilder.AddForeignKey(
                name: "FK_RefundCredits_PaymentReceipts_PaymentReceiptDbModelId",
                table: "RefundCredits",
                column: "PaymentReceiptDbModelId",
                principalTable: "PaymentReceipts",
                principalColumn: "Id");
        }
    }
}
