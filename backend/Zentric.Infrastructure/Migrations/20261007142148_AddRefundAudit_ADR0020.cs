using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Zentric.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddRefundAudit_ADR0020 : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "RefundAudits",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uuid", nullable: false),
                    ReturnRequestId = table.Column<Guid>(type: "uuid", nullable: false),
                    CustomerOrderId = table.Column<Guid>(type: "uuid", nullable: false),
                    OrderLineId = table.Column<Guid>(type: "uuid", nullable: true),
                    PaymentReceiptId = table.Column<Guid>(type: "uuid", nullable: false),
                    RuleApplied = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    DecisionType = table.Column<int>(type: "integer", nullable: false),
                    ActorId = table.Column<Guid>(type: "uuid", nullable: true),
                    ActorRole = table.Column<int>(type: "integer", nullable: true),
                    Outcome = table.Column<int>(type: "integer", nullable: false),
                    ErrorMessage = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    AttemptedAmount = table.Column<decimal>(type: "numeric", nullable: false),
                    Currency = table.Column<string>(type: "text", nullable: false),
                    OccurredAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_RefundAudits", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_RefundAudits_CustomerOrderId",
                table: "RefundAudits",
                column: "CustomerOrderId");

            migrationBuilder.CreateIndex(
                name: "IX_RefundAudits_OccurredAt",
                table: "RefundAudits",
                column: "OccurredAt");

            migrationBuilder.CreateIndex(
                name: "IX_RefundAudits_PaymentReceiptId",
                table: "RefundAudits",
                column: "PaymentReceiptId");

            migrationBuilder.CreateIndex(
                name: "IX_RefundAudits_ReturnRequestId",
                table: "RefundAudits",
                column: "ReturnRequestId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "RefundAudits");
        }
    }
}
