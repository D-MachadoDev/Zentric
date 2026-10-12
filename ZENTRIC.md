**ESPECIFICACIÓN FUNCIONAL:** 

**Zentric** 

# **CONTEXTO E INTRODUCCIÓN** 

## **1. Introducción y Contexto** 

Zentric es una plataforma digital centralizada que actúa como intermediario comercial entre compradores y vendedores. El sistema administra integralmente la operación, desde el registro de usuarios y publicación de productos hasta la logística, facturación y posventa, garantizando trazabilidad y coordinación entre todos los participantes. 

## **2. Objetivos y Alcance** 

El sistema deberá permitir el cumplimiento de los siguientes objetivos estratégicos: 

| **Código** | **Objetivo Funcional** |
| --- | --- |
| OBJ01 | Administrar la información de todos los usuarios del Marketplace. |
| OBJ02 | Gestionar el registro y administración de vendedores. |
| OBJ03 | Administrar compradores registrados. |
| OBJ04 | Controlar la información de las bodegas. |
| OBJ05 | Gestionar el catálogo de productos. |
| OBJ06 | Administrar el inventario distribuido. |
| OBJ07 | Gestionar el carrito de compras. |
| OBJ08 | Controlar el ciclo completo de los pedidos. |
| **Código** | **Objetivo Funcional** |
| OBJ09 | Administrar la facturación de las compras. |
| OBJ10 | Gestionar los procesos logísticos. |
| OBJ11 | Administrar devoluciones y reembolsos. |
| OBJ12 | Consolidar información administrativa para consulta. |

## **3. Alcance del Sistema** 

El sistema administrará exclusivamente los procesos descritos en esta especificación funcional. 

### **3.1 Procesos Incluidos** 

| **Proceso** | **Estatus** |
| --- | --- |
| Registro de compradores | [Image: Group 16955]✔ Incluido |
| Administración de usuarios | [Image: Group 17112]✔ Incluido |
| Registro administrativo de vendedores | [Image: Group 17211]✔ Incluido |
| Administración de bodegas | [Image: Group 17375]✔ Incluido |
| Gestión del catálogo de productos | [Image: Group 17460]✔ Incluido |
| Administración del inventario | [Image: Group 17537]✔ Incluido |
| Gestión del carrito de compras | [Image: Group 17652]✔ Incluido |
| Gestión de pedidos | [Image: Group 17714]✔ Incluido |
| Gestión de facturación | [Image: Group 17813]✔ Incluido |
| Gestión de envíos | [Image: Group 17888]✔ Incluido |
| Gestión de devoluciones | [Image: Group 17942]✔ Incluido |
| Gestión de reembolsos | [Image: Group 18006]✔ Incluido |
| **Proceso** | **Estatus** |
| Consulta de reportes administrativos | [Image: Group 17688]✔ Incluido |

### **3.2 Procesos Fuera del Alcance** 

El presente documento no contempla aspectos relacionados con interfaces gráficas, aplicaciones móviles, portales web, mecanismos de autenticación técnica, tecnologías de implementación, arquitectura del software ni detalles relacionados con el almacenamiento de la información. 

## **4. Descripción General del Marketplace** 

La organización facilita la comercialización de productos de terceros mediante una plataforma empresarial unificada, proporcionando la infraestructura necesaria para la operación comercial centralizada. 

### **4.1 Componentes Principales del Negocio** 

| **Componente** | **Descripción** |
| --- | --- |
| Usuarios | Personas autorizadas para interactuar con el sistema. |
| Vendedores | Responsables de comercializar productos. |
| Compradores | Usuarios que realizan compras. |
| Bodegas | Lugares donde se administra el inventario físico. |
| Productos | Bienes físicos o digitales ofrecidos. |
| Inventario | Existencias disponibles para comercialización. |
| Pedidos | Solicitudes de compra realizadas por compradores. |
| Facturación | Información comercial asociada a las ventas. |
| **Componente** | **Descripción** |
| Envíos | Procesos logísticos para productos físicos. |

## **5. Participantes del Negocio** 

Cada participante desempeña un único rol dentro del sistema y únicamente podrá interactuar con la información correspondiente a sus funciones. 

| **Participante** | **Descripción General** |
| --- | --- |
| Comprador | Persona que adquiere productos publicados. |
| Vendedor | Responsable de registrar y administrar sus productos. |
| Operador Logístico | Encargado de la operación física de bodegas y despachos. |
| Administrador | Responsable de la administración de vendedores y bodegas. |
| Supervisor | Perfil de consulta y seguimiento operativo. |

## **6. Modelo Operativo del Marketplace** 

El ciclo de negocio sigue un flujo funcional estructurado que garantiza la coherencia operativa. 

### **6.1 Flujo General del Negocio** 

1. **Incorporación:** El Administrador registra al vendedor y su primera bodega. 

2. **Catálogo:** El vendedor registra productos y define sus características. 

3. **Inventario:** Se registran existencias iniciales en las bodegas asociadas. 

4. **Publicación:** Los productos se hacen visibles en el catálogo público. 

5. **Compra:** El comprador selecciona productos mediante el carrito y confirma el pedido. 

6. **Transacción:** Se valida el pago y se inicia el flujo de preparación. 

7. **Logística:** Se realiza el empaque, despacho y transporte del pedido. 

8. **Cierre:** El pedido se marca como finalizado tras la entrega confirmada. 

[Image: Group 17593] 

# **DOMINIOS FUNCIONALES DEL NEGOCIO** 

## **DOMINIO 1. Administración de Usuarios** 

Este dominio constituye la base de autenticación e identificación del Marketplace. 

- **Objetivo:** Garantizar la correcta identificación y estado operativo de los usuarios. 

- **Participantes:** Todos los roles Comprador, Vendedor, Operador, Administrador, Supervisor). 

### **Tabla de Atributos: Usuarios** 

| **Atributo** | **Descripción Funcional** | **Obligatorio** | **Restricción** |
| --- | --- | --- | --- |
| Identificador | Identifica de forma única al usuario. | [Image: Group 16241]Sí | [Image: Group 16303]Único |
| Nombre completo | Nombre oficial del usuario. | [Image: Group 16602]Sí | [Image: Group 16657]No vacío |
| Correo electrónico | Medio principal de acceso y comunicación. | [Image: Group 16898]Sí | [Image: Group 16952]Único |
| Rol | Define las responsabilidades y permisos. | [Image: Group 17213]Sí | [Image: Group 17283]Único por us… |
| Estado | Condición operativa Activo, Bloqueado, etc.). | [Image: Group 17459]Sí | [Image: Group 17500]Catálogo def… |

## **DOMINIO 2. Gestión de Compradores** 

- **Objetivo:** Administrar la información específica para la participación en procesos comerciales. 

- **Restricción Clave:** El comprador nunca administrará información de otros compradores ni inventarios. 

| **Atributo** | **Descripción** | **Obligatorio** |
| --- | --- | --- |
| Dirección principal | Ubicación habitual para entregas. | [Image: Group 15964]Sí |
| Direcciones adicionales | Ubicaciones secundarias de entrega. | [Image: Group 16183]No |
| Estado comercial | Condición del comprador para realizar compras. | [Image: Group 16391]Sí |

## **DOMINIO 3. Gestión de Vendedores** 

- **Objetivo:** Administrar la incorporación y mantenimiento de proveedores de productos. 

- **Regla de Negocio:** Los vendedores no pueden auto-registrarse; son incorporados por el Administrador. 

## **DOMINIO 4. Gestión de Bodegas** 

- **Objetivo:** Controlar los espacios físicos de almacenamiento. 

- **Clasificación:** Se distinguen bodegas del Marketplace y bodegas de Vendedores. 

[Image: Group 17161] 

# **OPERACIÓN COMERCIAL Y LOGÍSTICA** 

## **DOMINIO 5. Gestión del Catálogo** 

El catálogo diferencia entre productos físicos (requieren inventario y despacho) y productos digitales (entrega inmediata tras pago). 

| **Atributo** | **Descripción** | **Tipo de Dato** |
| --- | --- | --- |
| Tipo de Producto | Físico o Digital. | [Image: Group 17073]Selección |
| **Atributo** | **Descripción** | **Tipo de Dato** |
| Variantes | Diferencias de color, talla, modelo, etc. | [Image: Group 16093]Lista |
| Estado | Publicado, Suspendido o Descontinuado. | [Image: Group 16288]Selección |

## **DOMINIO 6. Gestión del Inventario** 

El inventario es distribuido y debe estar vinculado obligatoriamente a un producto y una bodega específica. 

- **Movimientos:** Ingreso, Reserva, Salida por venta, Ajuste y Devolución. 

- **Restricción:** No se permitirán existencias negativas bajo ninguna circunstancia.

## **DOMINIO 7. Gestión de Pedidos** 

Representa el compromiso comercial formal. Su ciclo de vida es el proceso central del sistema. 

### **Ciclo de Estados del Pedido** 

1. **Carrito:** Selección provisional de productos. 

2. **Pendiente de Pago:** Espera de confirmación financiera. 

3. **Pagado:** Inicio de procesos de alistamiento. 

4. **Despachado:** Salida física de la bodega. 

5. **Entregado / Finalizado:** Conclusión satisfactoria de la entrega. 

[Image: Group 17259] 

# **RESTRICCIONES Y CONTROL DE CALIDAD** 

## **10. Restricciones Generales** 

| **Código** | **Restricción** |
| --- | --- |
| RG01 | Toda operación debe ejecutarse por un usuario autenticado. |
| RG02 | Cada usuario tendrá un único rol dentro del sistema. |
| **Código** | **Restricción** |
| RG03 | Ningún participante podrá administrar información fuera de su rol. |

## **11. Validaciones Críticas** 

- **Inventario:** No se puede reservar inventario inexistente o marcado como "Dañado". 

- **Pedidos:** Un pedido finalizado no podrá ser modificado bajo ninguna circunstancia. 

- **Usuarios:** El documento de identidad y correo electrónico deben ser únicos en la plataforma. 

## **12. Matriz de Responsabilidades** 

| **Proceso** | **Comprador** | **Vendedor** | **Op****. Logístico** | **Admin** |
| --- | --- | --- | --- | --- |
| Registro<br>Vendedores |  |  |  | ✔ |
| Registro<br>Productos |  | ✔ |  |  |
| Administració n Inventario |  | ✔ | ✔ |  |
| Gestión de Pedidos | ✔ | ✔ | ✔ |  |
| Gestión<br>Reembolsos | ✔ |  |  | ✔ |
---
# [ADDENDUM - DICTADO POR OWNER]
*Sección añadida para cubrir los vacíos de logística, facturación y devoluciones.*

## DOMINIO 8. Gestión de Logística y Despachos (Fulfillment) 
Deriva del pedido del cliente para organizar la entrega física por parte de cada vendedor.
- **Ciclo de Estados del Despacho:**
  1. **Pendiente de Empaque:** Esperando procesamiento en bodega.
  2. **Empacado:** Listo para recolección.
  3. **Despachado:** Entregado a la transportadora.
  4. **Entregado:** Recibido por el comprador.
  5. **Cancelado por Quiebre:** Cancelación unilateral del vendedor por falta física de stock.
- **Regla (Stock Fantasma):** No debería ocurrir, pero en caso de haber un quiebre de stock fantasma, el pedido se cancela con devolución obligatoria para no retener stock irreal.

## DOMINIO 9. Gestión de Facturación y Pagos 
Administrar el proceso financiero derivado de los pedidos.
- **Alcance:** Validación de transacciones, generación de facturas y conciliación de pagos a vendedores (split de pagos).
- **Documentos:**
  - **Factura Maestra:** Entregada al cliente con el total de la transacción.
  - **Detalle Zentric:** Detalle transaccional desglosado para control de plataforma.
  - **Factura de Vendedor:** Factura propia detallando el monto que le corresponde al Vendedor (Split).

## DOMINIO 10. Gestión de Devoluciones y Reembolsos 
Garantizar la resolución de conflictos posventa.
- **Estados de Devolución:** Solicitada, Aprobada, Rechazada, Reembolsada.
- **Regla (Prohibición):** Está **prohibido** devolver productos digitales.
- **Flujo Físico:** El operador logístico inspecciona que el producto esté en buen estado. Si es así, requiere la aprobación del Vendedor. Si ambas se cumplen, el producto vuelve al stock en el inventario con la etiqueta Usado.

---

# [ADDENDUM - DICTADO POR OWNER 2026-10-03]

*Adiciones ratificadas por el Owner. No alteran el texto original: cierran dos vacíos de la Ley que el sistema ya cumple.*

## DOMINIO 7 — Estado «Anulado» en el ciclo del pedido

El ciclo de estados del pedido se completa con un sexto estado:

6. **Anulado:** el pedido termina sin cumplirse cuando expira el plazo de reserva sin concretar el pago (incluidos los cobros rechazados). Al anularse se libera el inventario reservado y el pedido queda inmodificable, igual que el entregado.

## DOMINIO 8 — Alcance de la cancelación por quiebre de stock

Se aclara la frase «el pedido se cancela con devolución obligatoria»: ante un quiebre de stock fantasma **se cancela el despacho afectado** (la porción de un vendedor), no el pedido completo. La cancelación dispara la **devolución parcial** de las líneas afectadas; el resto del pedido y sus demás despachos continúan su flujo hasta la entrega. El pedido completo solo termina como **Anulado** según la adición anterior.
