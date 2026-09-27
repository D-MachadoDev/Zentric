# 01. Domain Overview (Visión General)

## 1. Patrón Arquitectónico
El Dominio de **Zentric Marketplace** está diseñado bajo los principios puros de **Domain-Driven Design (DDD)** y **Arquitectura Hexagonal**. Todo el negocio reside en este núcleo, completamente aislado de bases de datos, pasarelas web, frameworks o interfaces gráficas.

## 2. Límite de Contexto (Context Boundary)
El sistema opera bajo un **Único Bounded Context (Unified Domain)**. Para gestionar la complejidad y evitar el colapso del Lenguaje Ubicuo (Ubiquitous Language), el dominio se divide lógicamente en **Módulos de Dominio (Namespaces/Folders)** de alta cohesión.

## 3. Módulos de Dominio Internos

### 3.1. Identity Module (Gestión de Usuarios)
Controla la autenticación y el estado comercial de los participantes.
- **Conceptos Clave:** Unicidad de documentos, un solo rol por usuario, bloqueos disciplinarios.

### 3.2. Catalog Module (Catálogo de Productos)
Administra la oferta de los vendedores hacia los compradores.
- **Conceptos Clave:** Productos base y sus Variantes (SKU). Publicación automática y suspensión reactiva (incluso en cascada si un vendedor es bloqueado). Diferenciación estricta entre bienes Físicos y Digitales.

### 3.3. Inventory Module (Inventario y Bodegas)
El corazón logístico del sistema. Administra dónde están las cosas físicas y cuántas hay.
- **Conceptos Clave:** Control estricto a nivel de Variante y Bodega. Distinción de propiedad física (Bodegas Marketplace vs. Bodegas Vendor) y protección estricta sobre quién puede hacer ajustes manuales.

### 3.4. Ordering Module (Pedidos y Compras)
Transforma la intención de compra en un contrato (Pedido Maestro) y procesa los ingresos (Facturación centralizada).
- **Conceptos Clave:** Carritos efímeros vs. Pedidos formales. Reservas temporales (con *timeout*). Zentric como emisor central de la factura (Merchant of Record). Manejo del derecho a retracto (cancelación temprana).

### 3.5. Fulfillment Module (Despachos y Posventa)
Traduce el pedido maestro en órdenes de trabajo aisladas para cada vendedor, y gestiona las disputas.
- **Conceptos Clave:** Fragmentación del pedido (Master-Detail). Quiebres de stock (Cancelación unilateral y transacciones compensatorias). Devoluciones con verificación dual (Logística + Vendedor).
