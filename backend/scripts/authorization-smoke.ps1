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

# Alta de un usuario por rol. Nombres exactos de UserRole: Buyer, Seller, Administrator,
# Supervisor, LogisticsOperator (Q-22: ya no se envia el entero 0..4).
$adminToken = Login $AdminEmail $AdminPassword
$created = [ordered]@{
    Buyer      = "${suite}.buyer@q21.test"
    Seller     = "${suite}.seller@q21.test"
    Operator   = "${suite}.op@q21.test"
    Supervisor = "${suite}.sup@q21.test"
}
$roleOf = @{ Buyer = 'Buyer'; Seller = 'Seller'; Operator = 'LogisticsOperator'; Supervisor = 'Supervisor' }
$i = 0
foreach ($key in $created.Keys) {
    $i++
    $code = CreateUser $adminToken $created[$key] "Prueba $key" "Q21-$suite-$i" $roleOf[$key]
    Write-Host "alta $key -> HTTP $code"
}

$tok = @{
    Admin      = $adminToken
    Buyer      = Login $created['Buyer'] $pass
    Seller     = Login $created['Seller'] $pass
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
    @{ m='POST'; p='/api/logistics/fulfillment/cancel-ghost-stock'; b='{}';   who='Operator';   exp='403' }
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

"TOTAL DE COMPROBACIONES: $($cases.Count + 5) | FALLOS: $fallos"
"Limpieza de los usuarios de esta corrida: docker exec zentric-postgres psql -U postgres -d ZentricDb -c 'DELETE FROM ""Users"" WHERE ""Email"" LIKE ''%q21.test%'';'"

# Se sale SIEMPRE con un codigo explicito: sin esto, cuando no hay fallos el script no ejecuta
# ningun exit y $LASTEXITCODE conserva el valor del ultimo comando externo de la sesion, que es
# como CI se traga un verde inventado (pasó el 2026-09-29: 0 fallos con exit code 1 heredado).
exit $fallos

