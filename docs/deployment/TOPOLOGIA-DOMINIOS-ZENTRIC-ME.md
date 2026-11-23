# TOPOLOGÍA DE DESPLIEGUE Y ENRUTAMIENTO MULTI-ROL (ZENTRIC.ME)

**Fecha**: 2026-11-20  
**Objetivo**: Despliegue en producción de la plataforma multi-rol Zentric bajo el dominio principal `zentric.me`.  
**Director Técnico**: David Machado

---

## 1. Topología Canónica de Subdominios y Roles

Zentric desacopla la experiencia del comprador común de la operativa mercantil y administrativa para maximizar la seguridad, el rendimiento y la conversión.

```
                                  [ INTERNET ]
                                        │
                 ┌──────────────────────┼──────────────────────┐
                 ▼                      ▼                      ▼
        zentric.me (o www)      seller.zentric.me     console.zentric.me
        ──────────────────      ─────────────────     ──────────────────
        Tienda Comprador (B2C)  Portal Vendedores     Consola de Operaciones
```

### 1.1 `zentric.me` / `www.zentric.me` — Tienda Pública y Compradores (B2C)
* **Público Objetivo**: Compradores masivos (cualquier persona comprando tecnología, ropa, hogar, etc.).
* **Rutas Principales**:
  * `/` : Catálogo de productos, ofertas dinámicas, PDP (Product Detail Page).
  * `/login` (o `/entrar`): Inicio de sesión de comprador (diseño Retail Polaris, sin jerga corporativa).
  * `/register`: Alta rápida de nuevos compradores.
  * `/buyer/cart`: Carrito de compras con sincronización de invitado (`syncGuestCartToBackend`).
  * `/buyer/account`: Pedidos, direcciones de despacho y garantías.
* **Seguridad**: Abierto a indexación SEO, CDN edge caching con Cloudflare/Vercel.

### 1.2 `seller.zentric.me` — Portal de Comerciantes y Vendedores (B2B)
* **Público Objetivo**: Tiendas registradas, fabricantes y vendedores asociados.
* **Rutas Principales**:
  * `/login`: Acceso exclusivo para comerciantes.
  * `/dashboard`: KPIs de ventas, métricas de conversión.
  * `/catalog`: Publicación y edición de productos, variantes y precios.
  * `/inventory`: Gestión de stock, alertas de reposición.
  * `/orders`: Pedidos pendientes por despachar.
* **Seguridad**: `noindex, nofollow`, protección anti-fuerza bruta y rate limiting estricto.

### 1.3 `console.zentric.me` (o `ops.zentric.me`) — Consola Interna de Misión Crítica
* **Público Objetivo**: Roles internos del negocio:
  1. **Administrador General**: Configuración de comisiones, liquidaciones bancarias, auditoría.
  2. **Supervisor**: Resolución de disputas de clientes, cancelaciones, reclamos y mediación.
  3. **Operador Logístico**: Recepción en bodegas, validación de guías y despacho físico.
* **Seguridad**:
  * Aislamiento total de la tienda pública.
  * Autenticación con 2FA / MFA obligatorio.
  * Cero visibilidad para compradores para evitar vectores de ataque dirigidos.

---

## 2. El Enlace en el Login de Comprador: Estándar Mundial

### 2.1 La Duda Resuelta
¿Debe un login de comprador tener un acceso para vendedores?
* **Sí, rotundamente**. Amazon, Mercado Libre, Shopify y Etsy lo tienen al pie:
  * Amazon: *"¿Quieres vender en Amazon? Vende en Amazon"*.
  * Mercado Libre: *"¿Vendes en Mercado Libre? Ingresa a tu cuenta de vendedor"*.
  * Etsy: *"Sell on Etsy"*.
* **Por qué funciona**:
  1. Muchos vendedores ingresan primero a la tienda como compradores y necesitan un desvío claro hacia su panel sin tener que adivinar el subdominio.
  2. Muchos compradores frecuentes descubren que pueden vender sus propios productos en la plataforma.
* **Implementación en Zentric**:
  En el pie de [`LoginPage.tsx`](file:///C:/Users/da-V7/Desktop/Proyectos/Zentric/frontend/src/features/auth/LoginPage.tsx):
  ```tsx
  <div className="mt-4 flex items-center justify-center gap-2 text-center text-xs text-foreground-muted">
    <Store className="size-3.5 text-foreground-muted shrink-0" />
    <span>¿Quieres vender en Zentric? </span>
    <Link to="/acceso-corporativo" className="font-medium text-foreground hover:underline transition-colors">
      Portal de Vendedores →
    </Link>
  </div>
  ```
  En local apunta a `/acceso-corporativo` (donde convergen los roles internos), y en producción puede redirigir transparentemente a `https://seller.zentric.me`.

---

## 3. Configuración de DNS para Mañana (Namecheap / Cloudflare)

| Tipo | Host | Valor / Destino | TTL | Propósito |
|---|---|---|---|---|
| **A / CNAME** | `@` | IP del servidor / CNAME Vercel/Cloudflare | Automático | Tienda Comprador (`zentric.me`) |
| **CNAME** | `www` | `zentric.me` | Automático | Alias con www |
| **CNAME** | `seller` | Destino del build frontend (o IP) | Automático | Portal Vendedores |
| **CNAME** | `console` | Destino del build frontend (o IP) | Automático | Consola Interna (Ops/Admin/Logística) |
| **CNAME** | `api` | IP del servidor backend .NET 10 | Automático | Endpoint REST API (`api.zentric.me`) |

---

## 4. Próximos Pasos para Despliegue

1. **Frontend (Vite / React)**: Desplegar en Cloudflare Pages o Vercel configurando variables de entorno (`VITE_API_BASE_URL=https://api.zentric.me`).
2. **Backend (.NET 10 + PostgreSQL)**: Desplegar en VPS (Ubuntu/Docker) o Neon/Railway/Fly.io configurando CORS para admitir `https://zentric.me`, `https://seller.zentric.me` y `https://console.zentric.me`.
3. **Certificados SSL**: Cloudflare gestiona SSL universal gratuito para todos los subdominios (`*.zentric.me`).
