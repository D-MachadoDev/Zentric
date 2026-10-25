using System;
using System.Collections.Generic;

namespace Zentric.Infrastructure.Persistence.Models
{
    public class MoneyDbModel
    {
        public decimal Amount { get; set; }
        public string Currency { get; set; } = null!;
    }
}
