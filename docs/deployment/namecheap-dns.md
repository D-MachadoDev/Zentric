# Guía de Configuración DNS en Namecheap y Despliegue Multi-Entorno

> **Dominio:** `zentric.me`  
> **Entornos:** Producción (`zentric.me`, `www.zentric.me`) y Staging/Desarrollo (`dev.zentric.me`)  
> **Servidor Web y Terminación TLS:** Nginx Edge Reverse Proxy + Let's Encrypt  
> **Pila de Contenedores:** Docker Compose con ASP.NET Core 10 Kestrel (puerto 5076) y React SPA (puerto 5180)  

---

## 1. Visión General de la Topología de Red

El despliegue de Zentric Marketplace opera con aislamiento estricto entre entornos mediante nombres de dominio específicos:

```text
                                Internet (Clientes HTTP/HTTPS)
                                              │
                    ┌─────────────────────────┴─────────────────────────┐
                    ▼                                                   ▼
            https://zentric.me                                https://dev.zentric.me
         https://www.zentric.me                                         │
                    │                                                   │
        [Servidor Producción (PROD_IP)]                     [Servidor Staging (DEV_IP)]
                    │                                                   │
         Nginx Edge Reverse Proxy                            Nginx Edge Reverse Proxy
         (Puertos 80 / 443 SSL)                              (Puertos 80 / 443 SSL)
         Let's Encrypt TLS 1.2/1.3                           Let's Encrypt TLS 1.2/1.3
                    │                                                   │
        ┌───────────┴───────────┐                           ┌───────────┴───────────┐
        ▼                       ▼                           ▼                       ▼
Frontend SPA (5180)      Backend API (5076)         Frontend SPA (5180)      Backend API (5076)
zentric-frontend:prod    zentric-api:prod           zentric-frontend:dev     zentric-api:dev
        │                       │                           │                       │
        └───────────┬───────────┘                           └───────────┬───────────┘
                    ▼                                                   ▼
            PostgreSQL 16.15                                    PostgreSQL 16.15
        (Red interna aislada)                               (Red interna aislada)
```

---

## 2. Configuración en el Panel de Namecheap (Advanced DNS)

### 2.1 Pasos Preliminares en Namecheap
1. Inicie sesión en su cuenta de [Namecheap](https://www.namecheap.com/).
2. Diríjase a **Domain List** en el menú izquierdo y localice el dominio `zentric.me`.
3. Haga clic en el botón **Manage** junto a `zentric.me`.
4. En la pestaña **Domain**, asegúrese de que en la sección **NAMESERVERS** esté seleccionado **Namecheap BasicDNS** (necesario para gestionar los registros desde la pestaña Advanced DNS).
5. Haga clic en la pestaña **Advanced DNS**.
6. **Eliminar registros por defecto:** Si existen registros predeterminados de Namecheap (como `Parking Page` o redirecciones genéricas en `@` o `www`), bórrelos utilizando el icono de papelera.

### 2.2 Tabla Canónica de Registros DNS (Host Records)

Agregue los siguientes registros en la sección **Host Records** de Namecheap:

| Type | Host | Value / Target | TTL | Propósito |
|---|---|---|---|---|
| **A Record** | `@` | `<PROD_SERVER_PUBLIC_IP>` *(ej. `203.0.113.10`)* | 30 min *(o Automatic)* | Enruta el dominio raíz `zentric.me` hacia el servidor de producción. |
| **CNAME Record** | `www` | `zentric.me.` *(incluir punto final)* | 30 min *(o Automatic)* | Alias canónico de `www.zentric.me` hacia la raíz de producción. |
| **A Record** | `dev` | `<DEV_SERVER_PUBLIC_IP>` *(ej. `198.51.100.25`)* | 30 min *(o Automatic)* | Enruta el subdominio de staging `dev.zentric.me` a la máquina de pruebas. |
| **CAA Record** | `@` | `0 issue "letsencrypt.org"` | 30 min | Autoriza exclusivamente a Let's Encrypt para emitir certificados SSL para `zentric.me`. |
| **CAA Record** | `@` | `0 iodef "mailto:security@zentric.me"` | 30 min | Notificación de intentos de emisión no autorizados. |
| **TXT Record** | `@` | `v=spf1 -all` | 30 min | Política estricta de seguridad SPF para prevenir suplantación (spoofing) de correo. |

> **Nota sobre despliegue en un solo servidor:** Si Producción y Staging residen en el mismo host físico o VPS mediante contenedores diferenciados en puertos aislados, `<PROD_SERVER_PUBLIC_IP>` y `<DEV_SERVER_PUBLIC_IP>` tendrán la misma dirección IP pública. El reverse proxy Nginx discriminara el tráfico mediante el bloque `server_name`.

---

## 3. Verificación de la Propagación DNS

Una vez guardados los registros en Namecheap, la propagación suele tardar entre 5 y 30 minutos. Verifique la resolución desde su terminal:

### 3.1 Comandos de Verificación en Linux / macOS
```bash
# Verificar resolución del dominio raíz (Producción)
dig +short zentric.me A

# Verificar resolución del subdominio de staging
dig +short dev.zentric.me A

# Verificar alias CNAME de www
dig +short www.zentric.me CNAME

# Verificar registros CAA autorizados
dig +short zentric.me CAA
```

### 3.2 Comandos de Verificación en Windows (PowerShell)
```powershell
# Verificar registro A de zentric.me
Resolve-DnsName -Name zentric.me -Type A

# Verificar subdominio dev.zentric.me
Resolve-DnsName -Name dev.zentric.me -Type A

# Verificar alias CNAME de www
Resolve-DnsName -Name www.zentric.me -Type CNAME
```

---

## 4. Aprovisionamiento de Certificados SSL/TLS (Let's Encrypt)

Para que el servidor Nginx arranque con HTTPS en el puerto 443 sin advertencias de certificado, genere los certificados con Certbot una vez propagado el DNS.

### 4.1 Instalación de Certbot en Ubuntu/Debian
```bash
sudo apt update
sudo apt install -y certbot python3-certbot-nginx
```

### 4.2 Creación de Directorio Webroot para el Desafío ACME
```bash
sudo mkdir -p /var/www/certbot
sudo chown -R www-data:www-data /var/www/certbot
```

### 4.3 Emisión de Certificado para Producción (`zentric.me` y `www.zentric.me`)
```bash
sudo certbot certonly --webroot \
  -w /var/www/certbot \
  -d zentric.me \
  -d www.zentric.me \
  --agree-tos \
  -m admin@zentric.me \
  --no-eff-email \
  --non-interactive
```
Los certificados se alojarán automáticamente en:
- Certificado y cadena completa: `/etc/letsencrypt/live/zentric.me/fullchain.pem`
- Clave privada: `/etc/letsencrypt/live/zentric.me/privkey.pem`
- Cadena intermedia: `/etc/letsencrypt/live/zentric.me/chain.pem`

### 4.4 Emisión de Certificado para Staging (`dev.zentric.me`)
```bash
sudo certbot certonly --webroot \
  -w /var/www/certbot \
  -d dev.zentric.me \
  --agree-tos \
  -m admin@zentric.me \
  --no-eff-email \
  --non-interactive
```
Los certificados se alojarán en: `/etc/letsencrypt/live/dev.zentric.me/fullchain.pem`.

### 4.5 Renovación Automática de Certificados
Verifique el temporizador del sistema:
```bash
sudo systemctl status certbot.timer
```
Y pruebe la renovación en seco con recarga automática de Nginx:
```bash
sudo certbot renew --dry-run --deploy-hook "systemctl reload nginx"
```

---

## 5. Puesta en Marcha del Reverse Proxy Nginx

1. Copie la configuración del repositorio al directorio de Nginx:
   ```bash
   sudo cp nginx/zentric.me.conf /etc/nginx/sites-available/zentric.me.conf
   sudo ln -sf /etc/nginx/sites-available/zentric.me.conf /etc/nginx/sites-enabled/
   ```
2. Valide la sintaxis de la configuración:
   ```bash
   sudo nginx -t
   ```
3. Recargue Nginx:
   ```bash
   sudo systemctl reload nginx
   ```

---

## 6. Configuración de Secretos en GitHub Actions

Para habilitar la ejecución automática de los flujos `.github/workflows/deploy-dev.yml` y `.github/workflows/deploy-prod.yml`, configure las siguientes variables y secretos en **Settings > Secrets and variables > Actions** del repositorio de GitHub:

| Secreto / Variable | Entorno | Descripción |
|---|---|---|
| `PROD_SSH_HOST` | Producción | IP pública o nombre de host del servidor de producción (`zentric.me`). |
| `PROD_SSH_USER` | Producción | Usuario SSH con permisos Docker en el servidor (ej. `deploy` o `ubuntu`). |
| `PROD_SSH_KEY` | Producción | Clave privada SSH (formato OpenSSH / PEM) para autenticación sin contraseña. |
| `PROD_SSH_PORT` | Producción | Puerto del servicio SSH (por defecto `22`). |
| `PROD_DEPLOY_DIR` | Producción | Directorio destino en el host (por defecto `/opt/zentric`). |
| `STAGING_SSH_HOST` | Staging | IP pública del servidor de staging (`dev.zentric.me`). |
| `STAGING_SSH_USER` | Staging | Usuario SSH en el servidor de staging. |
| `STAGING_SSH_KEY` | Staging | Clave privada SSH para staging. |
| `STAGING_SSH_PORT` | Staging | Puerto SSH en staging (por defecto `22`). |
| `STAGING_DEPLOY_DIR`| Staging | Directorio destino en staging (por defecto `/opt/zentric-dev`). |

---

## 7. Pruebas de Humo y Verificación Post-Despliegue

Ejecute las siguientes comprobaciones para certificar que el despliegue está 100% operativo:

1. **Redirección HTTP a HTTPS:**
   ```bash
   curl -I http://zentric.me
   # Esperado: HTTP/1.1 301 Moved Permanently
   # Location: https://zentric.me/
   ```

2. **Cabeceras de Seguridad HSTS en HTTPS:**
   ```bash
   curl -s -I https://zentric.me | grep -iE 'strict-transport-security|x-content-type-Options|x-frame-options'
   # Esperado:
   # strict-transport-security: max-age=31536000; includeSubDomains; preload
   # x-content-type-options: nosniff
   # x-frame-options: DENY
   ```

3. **Sonda de Salud del Backend API:**
   ```bash
   curl -s -f https://zentric.me/health
   # Esperado:
   # {"status":"healthy","database":"up","timestamp":"..."}
   ```

4. **Calificación SSL en Qualys SSL Labs:**
   Visite `https://www.ssllabs.com/ssltest/analyze.html?d=zentric.me` para validar que la configuración obtiene grado **A+**.
