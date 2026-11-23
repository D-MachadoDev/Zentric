using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Zentric.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddBuyerNameAndImageUrlsToReviews : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("ALTER TABLE reviews ADD COLUMN IF NOT EXISTS \"BuyerName\" text;");
            migrationBuilder.Sql("ALTER TABLE reviews ADD COLUMN IF NOT EXISTS \"ImageUrlsJson\" text;");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("ALTER TABLE reviews DROP COLUMN IF EXISTS \"BuyerName\";");
            migrationBuilder.Sql("ALTER TABLE reviews DROP COLUMN IF EXISTS \"ImageUrlsJson\";");
        }
    }
}
