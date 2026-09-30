# Smoke de autorizacion por rol (Q-21 / RG-03, ADR-0011).
#
# Que hace: levanta un usuario por cada rol (Buyer, Seller, LogisticsOperator, Supervisor) con el
# token del Administrador y comprueba, contra una API corriendo, que cada rol recibe
# 401/403/200/abierto segun la matriz de backendSDD/Presentation/02-authorization.md.
#
# Como se ejecuta (la API y PostgreSQL deben estar arriba: `docker compose up -d`):
#   pwsh -File backend/scripts/authorization-smoke.ps1
#   pwsh -File backend/scripts/authorization-smoke.ps1 -BaseUrl http://localhost:5076
#
# Cero secrets en el repo (AGENTS.md seccion 2.5): la clave del smoke se lee de variables de
# entorno. Los defaults son los de DESARROLLO que ya estan publicados en docker-compose.yml, no
# credenciales reales; en cualquier otro entorno hay que pasar las variables.
#
# "abierto" en la salida = el rol SI puede llamar: la peticion viaja con cuerpo vacio o con un GUID
# inexistente a proposito, asi que se espera 400/404 (paso la barrera de autorizacion), no 401/403.
# Q-21b: un recurso ausente o ajeno responde 404 en lecturas Y en escrituras (dictamen del Owner);
# un 400 aqui significa que el recurso existe pero incumple una regla de negocio.
param(
    [string] $BaseUrl = 'http://localhost:5076',
    [string] $AdminEmail = $env:BOOTSTRAP_ADMIN_EMAIL,
    [string] $AdminPassword = $env:BOOTSTRAP_ADMIN_PASSWORD
)

$ErrorActionPreference = 'Stop'
if (-not $AdminEmail)    { $AdminEmail = 'admin@zentric.local' }      # default de docker-compose.yml en desarrollo
if (-not $AdminPassword) { $AdminPassword = 'AdminLocal12345' }       # default de docker-compose.yml en desarrollo
if ($BaseUrl -notmatch '^https?://') { throw "BaseUrl invalida: $BaseUrl" }

$base = $BaseUrl.TrimEnd('/')
$pass = 'Sm0ke!Q21pass'                       # contrasena de los usuarios temporales de esta corrida
$guid = '11111111-2222-3333-4444-555555555555'
$suite = 'q21' + (Get-Date -Format 'HHmmss')  # correo desechable por corrida: evita colision de unicidad

function Login([string]$email, [string]$password) {
    $body = @{ email = $email; password = $password } | ConvertTo-Json
    $json = Invoke-WebRequest -Uri "$base/api/auth/login" -Method Post -ContentType 'application/json' -Body $body -SkipHttpErrorCheck
    if ($json.StatusCode -ne 200) { throw "login $email -> $($json.StatusCode): $($json.Content)" }
    return ($json.Content | ConvertFrom-Json).token
}

function CreateUser([string]$token, [string]$email, [string]$fullName, [string]$document, [string]$role) {
    # Q-22 (ADR-0012): el rol viaja por nombre ("Seller"), no por entero. Un entero responde 400.
    $body = @{ email = $email; fullName = $fullName; identityDocument = $document; password = $pass; role = $role } | ConvertTo-Json
    $headers = @{}
    if ($token) { $headers['Authorization'] = "Bearer $token" }
    $res = Invoke-WebRequest -Uri "$base/api/users" -Method Post -ContentType 'application/json' -Headers $headers -Body $body -SkipHttpErrorCheck
    return $res.StatusCode
}

function Status([string]$method, [string]$path, [string]$token, [string]$body = '') {
    $headers = @{}
    if ($token) { $headers['Authorization'] = "Bearer $token" }
    $params = @{ Uri = "$base$path"; Method = $method; Headers = $headers; SkipHttpErrorCheck = $true }
    if ($body) { $params['ContentType'] = 'application/json'; $params['Body'] = $body }
    return (Invoke-WebRequest @params).StatusCode
}

# Q-21b: hace falta el CUERPO de la respuesta, no solo el codigo. "Order not found."
# y "not found" son precisamente la prueba de que el filtro de dueno actuo (un fallo
# de validacion devolveria otro mensaje, y el test pasaria por el motivo equivocado).
function Http([string]$method, [string]$path, [string]$token, [string]$body = '') {
    $headers = @{}
    if ($token) { $headers['Authorization'] = "Bearer $token" }
    $params = @{ Uri = "$base$path"; Method = $method; Headers = $headers; SkipHttpErrorCheck = $true }
    if ($body) { $params['ContentType'] = 'application/json'; $params['Body'] = $body }
    $res = Invoke-WebRequest @params
    return @{ code = $res.StatusCode; body = $res.Content }
}

function MeId([string]$token) {
    return (Http 'GET' '/api/auth/me' $token).body | ConvertFrom-Json | Select-Object -ExpandProperty userId
}

# Alta de un usuario por rol. Nombres exactos de UserRole: Buyer, Seller, Administrator,
# Supervisor, LogisticsOperator (Q-22: ya no se envia el entero 0..4).
$adminToken = Login $AdminEmail $AdminPassword
$created = [ordered]@{
    Buyer      = "${suite}.buyer@q21.test"
    Buyer2     = "${suite}.buyer2@q21.test"  # segundo comprador: prueba la propiedad cruzada (Q-21b)
    Seller     = "${suite}.seller@q21.test"
    Seller2    = "${suite}.seller2@q21.test" # segundo vendedor: mismo motivo
    Operator   = "${suite}.op@q21.test"
    Supervisor = "${suite}.sup@q21.test"
}
$roleOf = @{ Buyer = 'Buyer'; Buyer2 = 'Buyer'; Seller = 'Seller'; Seller2 = 'Seller'; Operator = 'LogisticsOperator'; Supervisor = 'Supervisor' }
# El nombre necesita al menos DOS palabras, de dos caracteres o mas y sin digitos
# (FullName); incumplirlo responderia 400 por un motivo que no tiene que ver con lo
# que este smoke prueba.
$nameOf = @{ Buyer = 'Comprador Uno'; Buyer2 = 'Comprador Dos'; Seller = 'Vendedor Uno'; Seller2 = 'Vendedor Dos'; Operator = 'Operador Logistico'; Supervisor = 'Super Uno' }
$i = 0
foreach ($key in $created.Keys) {
    $i++
    $code = CreateUser $adminToken $created[$key] $nameOf[$key] "Q21-$suite-$i" $roleOf[$key]
    Write-Host "alta $key -> HTTP $code"
}

$tok = @{
    Admin      = $adminToken
    Buyer      = Login $created['Buyer'] $pass
    Buyer2     = Login $created['Buyer2'] $pass
    Seller     = Login $created['Seller'] $pass
    Seller2    = Login $created['Seller2'] $pass
    Operator   = Login $created['Operator'] $pass
    Supervisor = Login $created['Supervisor'] $pass
}

# Matriz dictada, verificada contra HTTP real. 'abierto' = pasa la barrera (400/404 por payload
# vacio o id inexistente), es decir la autorizacion NO fue lo que corto la peticion.
$cases = @(
    @{ m='GET';  p='/api/Catalog/products';                                   who='(anonimo)'; exp='401' }
    @{ m='GET';  p='/api/users';                                              who='Buyer';      exp='403' }
    @{ m='GET';  p='/api/users';                                              who='Supervisor'; exp='403' }
    @{ m='GET';  p='/api/users';                                              who='Admin';      exp='200' }
    @{ m='GET';  p='/api/Warehouses';                                         who='Buyer';      exp='403' }
    @{ m='GET';  p='/api/Warehouses';                                         who='Seller';     exp='200' }
    @{ m='GET';  p="/api/Inventories/$guid";                                  who='Buyer';      exp='403' }
    @{ m='GET';  p="/api/Inventories/$guid";                                  who='Seller';     exp='abierto' }
    @{ m='POST'; p='/api/Inventories/stock';              b='{}';             who='Seller';     exp='abierto' }
    @{ m='POST'; p='/api/Inventories/stock';              b='{}';             who='Operator';   exp='abierto' }
    @{ m='POST'; p='/api/Inventories/stock';              b='{}';             who='Supervisor'; exp='403' }
    @{ m='POST'; p='/api/Catalog/products';               b='{}';             who='Seller';     exp='abierto' }
    @{ m='POST'; p='/api/Catalog/products';               b='{}';             who='Operator';   exp='403' }
    @{ m='POST'; p='/api/Catalog/products';               b='{}';             who='Admin';      exp='403' }
    @{ m='POST'; p='/api/orders/cart';                    b='{}';             who='Buyer';      exp='abierto' }
    @{ m='POST'; p='/api/orders/cart';                    b='{}';             who='Seller';     exp='403' }
    @{ m='POST'; p='/api/orders/cart';                    b='{}';             who='Supervisor'; exp='403' }
    @{ m='GET';  p="/api/orders/$guid";                                     who='Buyer';      exp='abierto' }
    @{ m='GET';  p="/api/orders/$guid";                                     who='Supervisor'; exp='abierto' }
    @{ m='POST'; p="/api/returns/$guid/approve";          b='{}';             who='Seller';     exp='abierto' }
    @{ m='POST'; p="/api/returns/$guid/approve";          b='{}';             who='Admin';      exp='403' }
    @{ m='POST'; p="/api/returns/$guid/approve";          b='{}';             who='Buyer';      exp='403' }
    @{ m='POST'; p="/api/returns/$guid/inspect";          b='{}';             who='Operator';   exp='abierto' }
    @{ m='POST'; p="/api/returns/$guid/inspect";          b='{}';             who='Seller';     exp='403' }
    @{ m='POST'; p='/api/logistics/fulfillment';          b='{}';             who='Seller';     exp='abierto' }
    @{ m='POST'; p='/api/logistics/fulfillment';          b='{}';             who='Buyer';      exp='403' }
    @{ m='POST'; p='/api/logistics/fulfillment/cancel-ghost-stock'; b='{}';   who='Seller';     exp='abierto' }
    @{ m='POST'; p='/api/logistics/fulfillment/cancel-ghost-stock'; b='{}';   who='Operator';   exp='abierto' }  # Q-21c: el Operador detecta el faltante en bodega y puede reportarlo
    @{ m='POST'; p="/api/billing/invoices/generate/$guid";                    who='Admin';      exp='abierto' }
    @{ m='POST'; p="/api/billing/invoices/generate/$guid";                    who='Seller';     exp='403' }
    @{ m='GET';  p='/api/auth/me';                                            who='Operator';   exp='200' }
)

$fallos = 0
foreach ($case in $cases) {
    $token = if ($case.who -eq '(anonimo)') { $null } else { $tok[$case.who] }
    $actual = Status $case.m $case.p $token $case.b
    $ok = switch ($case.exp) {
        '401'     { $actual -eq 401 }
        '403'     { $actual -eq 403 }
        '200'     { $actual -eq 200 }
        'abierto' { $actual -ne 401 -and $actual -ne 403 }
    }
    if (-not $ok) { $fallos++ }
    '{0,-5} {1,-11} {2,-45} esperado {3,-8} -> {4}  {5}' -f $case.m, $case.who, $case.p, $case.exp, $actual, $(if ($ok) { 'OK' } else { 'FALLO' })
}

# Unica excepcion a RG-01 (auto-registro de Comprador) y su contra-prueba. Los dos body llevan
# el rol por nombre, que desde Q-22 es la unica forma valida de escribirlo.
$anonBuyer = "${suite}.anon@q21.test"
$anonSeller = "${suite}.anonseller@q21.test"
$c1 = CreateUser $null $anonBuyer 'Compra Anonima' "Q21-$suite-a1" 'Buyer'
$c2 = CreateUser $null $anonSeller 'Vendedor Anonimo' "Q21-$suite-a2" 'Seller'
'POST  (anonimo)   /api/users "role":"Buyer"                 esperado 200      -> {0}  {1}' -f $c1, $(if ($c1 -eq 200) {'OK'} else {'FALLO'})
'POST  (anonimo)   /api/users "role":"Seller"                esperado 403      -> {0}  {1}' -f $c2, $(if ($c2 -eq 403) {'OK'} else {'FALLO'})
if ($c1 -ne 200) { $fallos++ }
if ($c2 -ne 403) { $fallos++ }

# Q-22 (ADR-0012, forma estricta dictada por el Owner): el cuerpo JSON de un enum solo admite el
# nombre. El entero deja de ser un valor valido (400), y el nombre debe seguir funcionando de
# punta a punta: si el registro no estuviera cableado al contrato, estas tres lineas lo delatan.
$q22Integer = "{""identityDocument"":""Q21-$suite-n1"",""fullName"":""Contrato Entero"",""email"":""$suite.num@q21.test"",""password"":""$pass"",""role"":2}"
$c3 = Status 'POST' '/api/users' $adminToken $q22Integer
'POST  Admin       /api/users "role":2 (entero)              esperado 400      -> {0}  {1}' -f $c3, $(if ($c3 -eq 400) {'OK'} else {'FALLO'})
$c4 = CreateUser $adminToken "${suite}.q22@q21.test" 'Contrato Nombre' "Q21-$suite-n2" 'Administrator'
'POST  Admin       /api/users "role":"Administrator"         esperado 200      -> {0}  {1}' -f $c4, $(if ($c4 -eq 200) {'OK'} else {'FALLO'})
$q22Lower = "{""identityDocument"":""Q21-$suite-n3"",""fullName"":""Contrato Minuscula"",""email"":""$suite.low@q21.test"",""password"":""$pass"",""role"":""supervisor""}"
$c5 = Status 'POST' '/api/users' $adminToken $q22Lower
'POST  Admin       /api/users "role":"supervisor"            esperado 200      -> {0}  {1}' -f $c5, $(if ($c5 -eq 200) {'OK'} else {'FALLO'})
if ($c3 -ne 400) { $fallos++ }
if ($c4 -ne 200) { $fallos++ }
if ($c5 -ne 200) { $fallos++ }

# ------------------------------------------------------------------ Q-21b: propiedad del recurso (ADR-0013)
# Se construye un pedido real de punta a punta y se comprueba, contra HTTP real, que
#   1) solo el dueno ve y opera su pedido, y que los ajenos responden 404;
#   2) el vendedor queda encerrado en su VendorId (= su User.Id) aunque el cuerpo diga otro;
#   3) cada rol ve solo el stock, las bodegas y las facturas que le tocan.
$q21bFallos = 0
$q21bTotal  = 0
function Q21b([string]$label, [bool]$ok, [string]$observed) {
    $script:q21bTotal++
    if (-not $ok) { $script:q21bFallos++ }
    '{0,-58} {1,-6} {2}' -f $label, $(if ($ok) { 'OK' } else { 'FALLO' }), $observed
}

$buyerMe  = MeId $tok['Buyer']
$buyer2Me = MeId $tok['Buyer2']
$sellerMe = MeId $tok['Seller']

# --- El vendedor queda encerrado en su VendorId: el cuerpo dice uno FALSO a proposito.
$wrongVendor = [guid]::NewGuid().ToString()
$productJson = @{
    name = 'Producto Q21b'; description = 'Alta de prueba de propiedad'
    priceAmount = 10000; priceCurrency = 'COP'; vendorId = $wrongVendor; type = 'Physical'
    variants = @(@{ sku = "Q21B-$suite"; attributes = @(@{ name = 'Color'; value = 'Azul' }) })
} | ConvertTo-Json -Depth 6
$product   = Http 'POST' '/api/Catalog/products' $tok['Seller'] $productJson
$productId = ''
$variantId = ''
$owner     = ''
if ($product.code -eq 200) {
    $productId = $product.body | ConvertFrom-Json
    $read = (Http 'GET' "/api/Catalog/products/$productId" $tok['Seller']).body | ConvertFrom-Json
    $owner     = $read.vendorId
    $variantId = $read.variants[0].id
}
Q21b 'alta de producto: el VendorId sale del token' ($owner -eq $sellerMe) "vendorId=$owner"
Q21b 'alta de producto: se descarta el VendorId del cuerpo' ($owner -ne '' -and $owner -ne $wrongVendor) "el cuerpo pedia $wrongVendor"

# --- Bodegas: el vendedor solo lista y usa la suya.
$ownWh   = Http 'POST' '/api/warehouses' $tok['Admin'] (@{ name = "Bodega Q21b $suite propia"; location = 'Bogota'; capacity = 100; type = 'Vendor'; vendorId = $sellerMe } | ConvertTo-Json)
$otherWh = Http 'POST' '/api/warehouses' $tok['Admin'] (@{ name = "Bodega Q21b $suite ajena"; location = 'Medellin'; capacity = 100; type = 'Vendor'; vendorId = $buyer2Me } | ConvertTo-Json)
$ownWhId   = $ownWh.body   | ConvertFrom-Json
$otherWhId = $otherWh.body | ConvertFrom-Json

$stockOwn = Http 'POST' '/api/Inventories/stock' $tok['Seller'] (@{ variantId = $variantId; warehouseId = $ownWhId; quantity = 5 } | ConvertTo-Json)
Q21b 'stock del producto propio en bodega propia' ($stockOwn.code -eq 200) "HTTP $($stockOwn.code) $($stockOwn.body)"
$stockOther = Http 'POST' '/api/Inventories/stock' $tok['Seller'] (@{ variantId = $variantId; warehouseId = $otherWhId; quantity = 5 } | ConvertTo-Json)
Q21b 'stock en bodega ajena rechazado -> 404' ($stockOther.code -eq 404 -and $stockOther.body -match 'not found') "HTTP $($stockOther.code) $($stockOther.body)"
$stockForeign = Http 'POST' '/api/Inventories/stock' $tok['Seller2'] (@{ variantId = $variantId; warehouseId = $ownWhId; quantity = 5 } | ConvertTo-Json)
Q21b 'otro vendedor no ingresa el stock de otro -> 404' ($stockForeign.code -eq 404 -and $stockForeign.body -match 'not found') "HTTP $($stockForeign.code) $($stockForeign.body)"

$invOwn = Http 'GET' "/api/Inventories/$variantId" $tok['Seller']
Q21b 'el vendedor lee el stock de su producto' ($invOwn.code -eq 200) "HTTP $($invOwn.code)"
$invUnknown = Http 'GET' "/api/Inventories/$guid" $tok['Seller']
Q21b 'variante ajena o inexistente -> 404' ($invUnknown.code -eq 404) "HTTP $($invUnknown.code)"

$whList   = Http 'GET' '/api/warehouses' $tok['Seller']
$ownCount = 0
if ($whList.code -eq 200) {
    $ownCount = @(($whList.body | ConvertFrom-Json) | Where-Object { $_.vendorId -eq $sellerMe }).Count
}
Q21b 'listado de bodegas: solo las suyas' ($whList.code -eq 200 -and $ownCount -eq 1) "propias=$ownCount HTTP $($whList.code)"
$whForeign = Http 'GET' "/api/warehouses?vendorId=$buyer2Me" $tok['Seller']
Q21b 'pedir bodegas de otro vendedor -> 400' ($whForeign.code -eq 400) "HTTP $($whForeign.code)"
$whByIdForeign = Http 'GET' "/api/warehouses/$otherWhId" $tok['Seller']
Q21b 'bodega ajena por id -> 404' ($whByIdForeign.code -eq 404) "HTTP $($whByIdForeign.code)"

# --- Pedido: solo su dueno lo ve y lo opera.
$cart    = Http 'POST' '/api/orders/cart' $tok['Buyer']
$orderId = $cart.body | ConvertFrom-Json
Q21b 'alta de carrito sin cuerpo (identidad del token)' ($cart.code -eq 200) "HTTP $($cart.code)"

$itemJson = @{ orderId = $orderId; variantId = $variantId; vendorId = $sellerMe; quantity = 2; unitPrice = 10000; currency = 'COP' } | ConvertTo-Json
$item = Http 'POST' '/api/orders/cart/items' $tok['Buyer'] $itemJson
Q21b 'agregar item al carrito propio' ($item.code -eq 200) "HTTP $($item.code) $($item.body)"
$stealItem = Http 'POST' '/api/orders/cart/items' $tok['Buyer2'] $itemJson
Q21b 'otro comprador no agrega items al carrito ajeno -> 404' ($stealItem.code -eq 404 -and $stealItem.body -match 'not found') "HTTP $($stealItem.code) $($stealItem.body)"

$checkout = Http 'POST' "/api/orders/$orderId/checkout" $tok['Buyer']
Q21b 'checkout propio' ($checkout.code -eq 200) "HTTP $($checkout.code) $($checkout.body)"
$stealCheckout = Http 'POST' "/api/orders/$orderId/checkout" $tok['Buyer2']
Q21b 'otro comprador no hace checkout ajeno -> 404' ($stealCheckout.code -eq 404 -and $stealCheckout.body -match 'not found') "HTTP $($stealCheckout.code) $($stealCheckout.body)"

$pay = Http 'POST' "/api/orders/$orderId/pay" $tok['Buyer']
Q21b 'pago propio' ($pay.code -eq 200) "HTTP $($pay.code) $($pay.body)"
$stealPay = Http 'POST' "/api/orders/$orderId/pay" $tok['Buyer2']
Q21b 'otro comprador no paga un pedido ajeno -> 404' ($stealPay.code -eq 404 -and $stealPay.body -match 'not found') "HTTP $($stealPay.code) $($stealPay.body)"

Q21b 'el dueno lee su pedido' ((Http 'GET' "/api/orders/$orderId" $tok['Buyer']).code -eq 200) ''
Q21b 'otro comprador -> 404' ((Http 'GET' "/api/orders/$orderId" $tok['Buyer2']).code -eq 404) ''
Q21b 'administrador lee sin filtro (repara el 404 de Q-21)' ((Http 'GET' "/api/orders/$orderId" $tok['Admin']).code -eq 200) ''
Q21b 'operador lee sin filtro' ((Http 'GET' "/api/orders/$orderId" $tok['Operator']).code -eq 200) ''
Q21b 'supervisor lee sin filtro' ((Http 'GET' "/api/orders/$orderId" $tok['Supervisor']).code -eq 200) ''

$view     = Http 'GET' "/api/orders/$orderId" $tok['Seller']
$viewOk   = $false
$viewInfo = "HTTP $($view.code)"
if ($view.code -eq 200) {
    $v = $view.body | ConvertFrom-Json
    $viewOk = ($null -ne $v.vendorSubtotal) -and (@($v.items).Count -eq 1)
    $viewInfo = "items=$(@($v.items).Count) subtotal=$($v.vendorSubtotal) totalPedido=$($v.totalAmount)"
}
Q21b 'el vendedor ve la vista filtrada, sin el total ajeno' $viewOk $viewInfo

$cart2    = Http 'POST' '/api/orders/cart' $tok['Buyer2']
$order2Id = $cart2.body | ConvertFrom-Json
Q21b 'el vendedor no lee un pedido en el que no participa' ((Http 'GET' "/api/orders/$order2Id" $tok['Seller']).code -eq 404) ''

# --- Facturas: cada rol ve solo las suyas (P3).
$gen = Http 'POST' "/api/billing/invoices/generate/$orderId" $tok['Admin']
Q21b 'emision de facturas por el Administrador' ($gen.code -eq 200) "HTTP $($gen.code) $($gen.body)"

$invCount = @{}
foreach ($who in @('Buyer', 'Seller', 'Admin')) {
    $r = Http 'GET' "/api/billing/invoices/order/$orderId" $tok[$who]
    $invCount[$who] = if ($r.code -eq 200) { @($r.body | ConvertFrom-Json).Count } else { -1 }
}
Q21b 'el comprador ve solo su Factura Maestra' ($invCount['Buyer'] -eq 1) "facturas=$($invCount['Buyer'])"
Q21b 'el vendedor ve solo su factura de vendedor' ($invCount['Seller'] -eq 1) "facturas=$($invCount['Seller'])"
Q21b 'el administrador ve todas (incluida la de plataforma)' ($invCount['Admin'] -eq 3) "facturas=$($invCount['Admin'])"
$invForeign = Http 'GET' "/api/billing/invoices/order/$orderId" $tok['Buyer2']
Q21b 'facturas de un pedido ajeno -> 404' ($invForeign.code -eq 404) "HTTP $($invForeign.code)"

# --- Devoluciones: se radican sobre pedidos propios y las aprueba su vendedor.
$retJson = @{ customerOrderId = $orderId; variantId = $variantId; warehouseId = $ownWhId; quantity = 1; productType = 'Physical' } | ConvertTo-Json
$ret    = Http 'POST' '/api/returns/request' $tok['Buyer'] $retJson
$retId  = if ($ret.code -eq 200) { $ret.body | ConvertFrom-Json } else { '' }
Q21b 'devolucion sobre pedido propio' ($ret.code -eq 200) "HTTP $($ret.code) $($ret.body)"
$retForeign = Http 'POST' '/api/returns/request' $tok['Buyer2'] $retJson
Q21b 'devolucion sobre pedido ajeno rechazada -> 404' ($retForeign.code -eq 404 -and $retForeign.body -match 'not found') "HTTP $($retForeign.code) $($retForeign.body)"

$approveJson = @{ returnRequestId = $retId; isSameWarehouseAndVendor = $true } | ConvertTo-Json
$approve = Http 'POST' "/api/returns/$retId/approve" $tok['Seller'] $approveJson
Q21b 'el vendedor del producto aprueba la devolucion' ($approve.code -eq 200) "HTTP $($approve.code) $($approve.body)"
$approveForeign = Http 'POST' "/api/returns/$retId/approve" $tok['Seller2'] $approveJson
Q21b 'otro vendedor no aprueba la devolucion -> 404' ($approveForeign.code -eq 404 -and $approveForeign.body -match 'not found') "HTTP $($approveForeign.code) $($approveForeign.body)"

"TOTAL DE COMPROBACIONES: $($cases.Count + 5 + $q21bTotal) | FALLOS: $($fallos + $q21bFallos)"
"Limpieza de los usuarios de esta corrida: docker exec zentric-postgres psql -U postgres -d ZentricDb -c 'DELETE FROM ""Users"" WHERE ""Email"" LIKE ''%q21.test%'';'"
"El bloque Q-21b deja ademas datos de demo (1 producto con variante, 2 bodegas, 2 carritos, 1 pedido pagado con sus facturas y 1 devolucion). La base es desechable: docker compose down -v"

# Se sale SIEMPRE con un codigo explicito: sin esto, cuando no hay fallos el script no ejecuta
# ningun exit y $LASTEXITCODE conserva el valor del ultimo comando externo de la sesion, que es
# como CI se traga un verde inventado (pasó el 2026-09-29: 0 fallos con exit code 1 heredado).
exit ($fallos + $q21bFallos)

