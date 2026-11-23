export interface LegalSubclause {
  code: string;
  title: string;
  text: string;
}

export interface LegalChapter {
  id: string;
  num: string;
  title: string;
  summary: string;
  subclauses: LegalSubclause[];
}

export interface LegalDocument {
  badge: string;
  title: string;
  desc: string;
  chapters: LegalChapter[];
}

export type LegalTabKey = 'terms' | 'privacy' | 'cookies' | 'consumer';

export const LEGAL_METADATA = {
  contractVersion: 'v2.4 (2026)',
  lastRevision: '15 de enero 2026',
  jurisdiction: 'Bogotá D.C., Colombia',
  legalEntity: 'Zentric Marketplace S.A.S.',
  nit: 'NIT 900.123.456-7',
  commercialRegistry: 'Cámara de Comercio de Bogotá, Matrícula N° 1234567',
  supportEmail: 'legal@zentric.me',
  pqrEmail: 'pqr@zentric.me',
  privacyEmail: 'privacidad@zentric.me',
} as const;

export const legalDocumentsData: Record<LegalTabKey, LegalDocument> = {
  terms: {
    badge: 'Términos',
    title: 'Términos y Condiciones Generales de Uso del Marketplace',
    desc: 'Contrato marco regulador de los derechos y obligaciones entre Zentric Marketplace S.A.S., los Compradores y los Comerciantes Vendedores.',
    chapters: [
      {
        id: 'cap-1',
        num: 'Capítulo 1',
        title: 'Ámbito de Aplicación, Partes y Definiciones Contractuales',
        summary:
          'Regula el uso de la plataforma electrónica de Zentric como operador de intermediación mercantil y establece los términos jurídicos definidos para toda la relación comercial.',
        subclauses: [
          {
            code: '1.1',
            title: 'Partes Contratantes',
            text: 'El presente contrato vincula jurídicamente a <strong>Zentric Marketplace S.A.S.</strong> (NIT 900.123.456-7), domiciliada en Bogotá D.C., Colombia, en calidad de OPERADOR DE LA PLATAFORMA, y por la otra parte a toda persona natural o jurídica que acceda, se registre, navegue o utilice los servicios en calidad de USUARIO (comprendiendo las calidades de COMPRADOR o VENDEDOR).',
          },
          {
            code: '1.2',
            title: 'Definiciones Contractuales',
            text: 'Para la debida interpretación del presente contrato se adoptan las siguientes definiciones: (a) <strong>PLATAFORMA</strong>: Ecosistema digital accesible mediante la web y APIs oficiales de Zentric. (b) <strong>COMPRADOR</strong>: Usuario registrado o invitado que adquiere productos físicos exhibidos en el catálogo. (c) <strong>VENDEDOR</strong>: Comerciante habilitado que oferta mercancías bajo su propia responsabilidad comercial. (d) <strong>CHECKOUT INTENT</strong>: Sesión atómica de pago que bloquea temporalmente el inventario. (e) <strong>SPLIT PAYOUT</strong>: Mecanismo de dispersión programada que asigna el 95% al Vendedor y el 5% a Zentric como comisión de intermediación.',
          },
          {
            code: '1.3',
            title: 'Régimen de Comercio Electrónico',
            text: 'El contrato se celebra mediante mensajes de datos con plena validez, eficacia probatoria y fuerza obligatoria de acuerdo con la Ley 527 de 1999 y el Título II de la Circular Única de la Superintendencia de Industria y Comercio (SIC).',
          },
        ],
      },
      {
        id: 'cap-2',
        num: 'Capítulo 2',
        title: 'Capacidad Legal, Registro y Seguridad de la Cuenta',
        summary:
          'Establece los requisitos obligatorios de mayoría de edad para contratar, la veracidad juramentada de datos y la prohibición expresa de cuentas duplicadas o suplantaciones.',
        subclauses: [
          {
            code: '2.1',
            title: 'Capacidad para Contratar',
            text: 'Los servicios de Zentric están disponibles únicamente para personas que tengan capacidad legal para contratar de conformidad con el Código Civil y de Comercio de Colombia. Quien registre una cuenta en representación de una persona jurídica declara bajo la gravedad de juramento contar con facultades suficientes según certificado de existencia y representación legal vigente.',
          },
          {
            code: '2.2',
            title: 'Registro y Veracidad de Información',
            text: 'El Usuario se obliga a completar los formularios de registro con datos exactos, veraces y actualizados. Zentric se reserva el derecho de solicitar documentos de identidad, comprobantes fiscales o certificados bancarios para verificar la autenticidad del registro y suspender preventivamente cuentas con datos inconsistentes.',
          },
          {
            code: '2.3',
            title: 'Custodia de Credenciales y Prohibición de Cesión',
            text: 'La cuenta es personal, única e intransferible. Está terminantemente prohibida la venta, cesión o transferencia de cuentas a terceros. El Usuario es el único responsable de la confidencialidad de su clave secreta y de las operaciones cursadas desde su perfil.',
          },
        ],
      },
      {
        id: 'cap-3',
        num: 'Capítulo 3',
        title: 'Obligaciones y Políticas de Publicación del Vendedor',
        summary:
          'Exige stock físico real en bodega antes de ofertar, precios definitivos en pesos colombianos con IVA incluido y prohíbe eludir la plataforma para ventas directas.',
        subclauses: [
          {
            code: '3.1',
            title: 'Garantía de Stock Físico Disponible',
            text: 'El Vendedor está obligado a publicar exclusivamente productos que posea físicamente en su inventario o bodega disponible para despacho inmediato dentro de los plazos comprometidos. Queda terminantemente prohibida la sobreventa especulativa.',
          },
          {
            code: '3.2',
            title: 'Transparencia de Precios e Impuestos (Ley 1480, Art. 50)',
            text: 'Todos los precios exhibidos en el catálogo deben estar denominados en pesos colombianos (COP), ser finales e incluir obligatoriamente el Impuesto sobre las Ventas (IVA) aplicable y los gravámenes tributarios vigentes. Los fletes de transporte se liquidarán de forma visible antes del pago.',
          },
          {
            code: '3.3',
            title: 'Prohibición de Elusión y Contacto Externo',
            text: 'Está estrictamente prohibido incluir datos de contacto externos (teléfonos, correos, enlaces externos o códigos QR) en publicaciones o mensajes con el propósito de desviar compradores fuera de Zentric para eludir el pago de la tarifa de intermediación mercantil.',
          },
        ],
      },
      {
        id: 'cap-4',
        num: 'Capítulo 4',
        title: 'Proceso de Compra, Reserva Atómica y Facturación',
        summary:
          'La orden constituye una oferta irrevocable. Zentric reserva el inventario por 15 minutos exactos y emite un comprobante consolidado por la orden global.',
        subclauses: [
          {
            code: '4.1',
            title: 'Perfeccionamiento de la Compraventa',
            text: 'Al hacer clic en el botón de confirmación de pago, el Comprador emite una oferta vinculante de compra por los bienes seleccionados en su carrito, la cual se perfecciona tras la autorización bancaria del débito.',
          },
          {
            code: '4.2',
            title: 'Protocolo de Reserva Atómica con Timeout (900 Segundos)',
            text: 'Para garantizar la paridad transaccional y evitar colisiones de stock entre compradores concurrentes, el sistema genera un bloqueo atómico de las unidades en la base de datos por un lapso perentorio de quince (15) minutos (900 segundos). Si el pago no es validado en dicho plazo, la reserva expira automáticamente sin penalidad alguna.',
          },
          {
            code: '4.3',
            title: 'Facturación Maestra Consolidada (DIAN)',
            text: 'Para órdenes que contengan ítems de múltiples vendedores en un único carrito, el Comprador recibe un comprobante fiscal global consolidado, mientras cada Vendedor recibe la orden de despacho individual correspondiente a su rebanada de inventario.',
          },
        ],
      },
      {
        id: 'cap-5',
        num: 'Capítulo 5',
        title: 'Tarifas de Servicio, Custodia y Dispersión de Fondos (Split 95/5)',
        summary:
          'Zentric custodia provisionalmente el dinero en pasarelas PCI-DSS Nivel 1 y liquida el 95% al vendedor únicamente tras certificar la entrega física de la guía.',
        subclauses: [
          {
            code: '5.1',
            title: 'Mecanismo de Custodia Provisional',
            text: 'Los fondos desembolsados por el Comprador son recaudados y custodiados temporalmente a través de pasarelas de pago vigiladas por la Superintendencia Financiera de Colombia bajo el estándar PCI-DSS Nivel 1. Zentric no capta dineros del público de forma directa.',
          },
          {
            code: '5.2',
            title: 'Dispersión Atómica de Fondos (Split Payout)',
            text: 'Por cada transacción perfeccionada, Zentric retiene una tarifa de intermediación tecnológica del cinco por ciento (5%) sobre el valor neto de la mercancía. El noventa y cinco por ciento (95%) restante corresponde al Vendedor.',
          },
          {
            code: '5.3',
            title: 'Condición Suspensiva de Desembolso',
            text: 'La transferencia de fondos a la cuenta bancaria del Vendedor está sujeta a la condición suspensiva de que el transportador certificado confirme electrónicamente la entrega material del paquete al Comprador.',
          },
        ],
      },
      {
        id: 'cap-6',
        num: 'Capítulo 6',
        title: 'Derecho de Retracto Legal y Reversión del Pago',
        summary:
          'Garantiza el retracto legal en 5 días hábiles conforme al Art. 47 de la Ley 1480 y la reversión de pagos por fraude o producto no recibido según el Decreto 587 de 2016.',
        subclauses: [
          {
            code: '6.1',
            title: 'Derecho de Retracto (Artículo 47, Ley 1480 de 2011)',
            text: 'El Comprador podrá ejercer el derecho de retracto dentro de los cinco (5) días hábiles siguientes a la entrega material del bien. El Comprador deberá devolver el producto en las mismas condiciones en que lo recibió, con sus empaques y etiquetas originales. El dinero será restituido en su totalidad en un plazo máximo de treinta (30) días calendario sin deducciones.',
          },
          {
            code: '6.2',
            title: 'Reversión del Pago (Artículo 51, Ley 1480 y Decreto 587 de 2016)',
            text: 'Procederá la reversión total del pago en compras electrónicas cuando el consumidor acredite: (a) Fraude electrónico o suplantación, (b) Operación no solicitada, (c) Falta de entrega del producto en el tiempo acordado, (d) Entrega de un producto defectuoso o que no corresponda a lo solicitado.',
          },
          {
            code: '6.3',
            title: 'Término de Notificación de Reversión',
            text: 'El consumidor deberá presentar queja formal ante Zentric e informar al emisor del instrumento de pago electrónico dentro de los cinco (5) días hábiles siguientes al conocimiento del evento.',
          },
        ],
      },
      {
        id: 'cap-7',
        num: 'Capítulo 7',
        title: 'Garantía Legal e Idoneidad de los Productos',
        summary:
          'El Vendedor es el obligado directo por la calidad y funcionalidad de los bienes comercializados conforme a las normas de protección al consumidor.',
        subclauses: [
          {
            code: '7.1',
            title: 'Responsabilidad Directa del Vendedor',
            text: 'De conformidad con el artículo 7 y siguientes de la Ley 1480 de 2011, los Vendedores responden solidaria e independientemente por la calidad, idoneidad, seguridad y correcto funcionamiento de los productos ofrecidos.',
          },
          {
            code: '7.2',
            title: 'Procedimiento de Reclamación por Garantía',
            text: 'El Comprador podrá radicar reclamaciones por garantía técnica a través del canal oficial de PQR de Zentric. Cuando el producto resulte defectuoso, el Vendedor procederá a su reparación técnica gratuita o, de subsistir la falla, al cambio del bien o reintegro del dinero pagado.',
          },
        ],
      },
      {
        id: 'cap-8',
        num: 'Capítulo 8',
        title: 'Régimen Sancionatorio, Suspensión e Inhabilitación de Cuentas',
        summary:
          'Faculta a Zentric a suspender o expulsar usuarios que incurran en fraude, manipulación de reputación, sobreventa o incumplimiento normativo reiterado.',
        subclauses: [
          {
            code: '8.1',
            title: 'Causales Taxativas de Suspensión',
            text: 'Zentric podrá suspender temporal o definitivamente la cuenta de un Usuario cuando: (a) Se detecten indicios fundados de fraude o suplantación de identidad, (b) Se incurra en manipulación maliciosa de precios o calificaciones, (c) El Vendedor acumule una tasa de cancelación de órdenes superior al 5%, o (d) Se comercialicen productos prohibidos por la ley.',
          },
          {
            code: '8.2',
            title: 'Efectos de la Inhabilitación',
            text: 'La inhabilitación de una cuenta implica la cancelación inmediata de todas las publicaciones activas y la retención preventiva de fondos en balance pendiente hasta tanto se certifique la culminación o reembolso de las órdenes en tránsito.',
          },
        ],
      },
      {
        id: 'cap-9',
        num: 'Capítulo 9',
        title: 'Límites de Responsabilidad, Disponibilidad e Indemnidad',
        summary:
          'Delimita la responsabilidad del marketplace como intermediario tecnológico y consagra la indemnidad del operador por actos ilícitos cometidos por usuarios.',
        subclauses: [
          {
            code: '9.1',
            title: 'Naturaleza de Intermediario Tecnológico',
            text: 'Zentric pone a disposición una plataforma digital para el encuentro de oferta y demanda. Salvo en los casos expresamente señalados por ley, Zentric no es propietaria de los artículos ofrecidos ni responde por los vicios ocultos de las mercancías de los Vendedores.',
          },
          {
            code: '9.2',
            title: 'Cláusula de Indemnidad',
            text: 'El Usuario mantendrá indemne a Zentric Marketplace S.A.S., sus directores y empleados frente a cualquier reclamo, demanda, sanción o costo judicial originado en el incumplimiento de estos términos o la violación de derechos de terceros.',
          },
        ],
      },
      {
        id: 'cap-10',
        num: 'Capítulo 10',
        title: 'Mecanismo de PQR, Ley Aplicable y Jurisdicción',
        summary:
          'Establece el canal de radicado para reclamos con respuesta en 15 días hábiles y somete cualquier controversia a la jurisdicción ordinaria de Bogotá D.C.',
        subclauses: [
          {
            code: '10.1',
            title: 'Atención de Peticiones, Quejas y Reclamos (PQR)',
            text: 'Toda PQR radicada a través de pqr@zentric.me o desde el panel de usuario recibirá un número de radicado consecutivo y será resuelta de fondo en un término perentorio máximo de quince (15) días hábiles (Artículo 58 de la Ley 1480 de 2011).',
          },
          {
            code: '10.2',
            title: 'Etapa de Arreglo Directo Obligatoria',
            text: 'Las partes se comprometen a agotar una etapa de arreglo directo no inferior a quince (15) días hábiles antes de iniciar cualquier reclamación contenciosa.',
          },
          {
            code: '10.3',
            title: 'Legislación Colombiana y Domicilio Contractual',
            text: 'Este contrato se rige e interpretará íntegramente por las leyes de la República de Colombia. Toda diferencia no resuelta en arreglo directo será sometida a los jueces competentes de la ciudad de Bogotá D.C., Colombia.',
          },
        ],
      },
    ],
  },
  privacy: {
    badge: 'Privacidad',
    title: 'Política de Tratamiento de Datos Personales (Ley 1581 de 2012)',
    desc: 'Reglamentación del tratamiento, almacenamiento y protección de datos personales y garantías de Habeas Data.',
    chapters: [
      {
        id: 'priv-1',
        num: 'Capítulo 1',
        title: 'Identificación del Responsable y Canales de Notificación',
        summary:
          'Identifica a Zentric Marketplace S.A.S. como Responsable del Tratamiento y designa canales formales para el ejercicio de derechos ARCO.',
        subclauses: [
          {
            code: '1.1',
            title: 'Datos del Responsable',
            text: 'Zentric Marketplace S.A.S., sociedad comercial identificada con NIT 900.123.456-7, con domicilio en Bogotá D.C., Colombia, teléfono (+57) 601 745 0000 y correo electrónico <strong>privacidad@zentric.me</strong>, actúa como Responsable del Tratamiento de los datos personales recolectados.',
          },
          {
            code: '1.2',
            title: 'Marco Normativo Aplicable',
            text: 'La presente política se fundamenta en el artículo 15 de la Constitución Política de Colombia, la Ley Estatutaria 1581 de 2012 y el Decreto Reglamentario 1377 de 2013.',
          },
        ],
      },
      {
        id: 'priv-2',
        num: 'Capítulo 2',
        title: 'Categorías de Datos Objeto de Tratamiento y Exclusión de Datos Financieros',
        summary:
          'Precisa que Zentric recopila datos identificativos y logísticos, pero nunca almacena credenciales bancarias ni códigos CVV en sus servidores.',
        subclauses: [
          {
            code: '2.1',
            title: 'Datos Recolectados',
            text: 'Se recopilan datos indispensables para la relación contractual: nombres y apellidos, tipo y número de documento de identidad (C.C., C.E., NIT), dirección física de domicilio o despacho, número de teléfono móvil y dirección de correo electrónico.',
          },
          {
            code: '2.2',
            title: 'Exclusión Estricta de Datos Financieros Sensibles',
            text: 'Zentric no almacena números completos de tarjetas de crédito o débito, fechas de vencimiento ni códigos de seguridad CVV. Toda la información bancaria es capturada y tokenizada de forma directa por pasarelas certificadas bajo estándar internacional PCI-DSS.',
          },
        ],
      },
      {
        id: 'priv-3',
        num: 'Capítulo 3',
        title: 'Finalidades Exclusivas y Prohibición de Cesión a Terceros',
        summary:
          'Los datos se utilizan estrictamente para procesar órdenes, despachar paquetes, emitir facturación DIAN y prevenir fraude. No se comercializan.',
        subclauses: [
          {
            code: '3.1',
            title: 'Finalidades Necesarias',
            text: 'Los datos serán utilizados para: (a) Gestionar la orden de compra y remitir datos de despacho al transportador, (b) Generar y transmitir la factura electrónica DIAN, (c) Monitorear anomalías y prevenir delitos informáticos, y (d) Atender requerimientos de autoridades judiciales o administrativas colombianas.',
          },
          {
            code: '3.2',
            title: 'Prohibición de Comercialización',
            text: 'Zentric no vende, arrienda ni cede las bases de datos de sus usuarios a terceras empresas con fines de publicidad o prospección comercial ajena sin mediar consentimiento previo e informado del Titular.',
          },
        ],
      },
      {
        id: 'priv-4',
        num: 'Capítulo 4',
        title: 'Derechos del Titular (Derechos ARCO) y Canales de Radicación',
        summary:
          'Garantiza el derecho a conocer, actualizar, rectificar y suprimir datos, con respuesta en 10 días hábiles para consultas y 15 días hábiles para reclamos.',
        subclauses: [
          {
            code: '4.1',
            title: 'Catálogo de Derechos ARCO',
            text: 'El titular tiene derecho a: Conocer, actualizar y rectificar sus datos personales frente a Zentric; Solicitar prueba de la autorización otorgada; Ser informado sobre el uso que se ha dado a sus datos; y Revocar la autorización o solicitar la supresión del dato.',
          },
          {
            code: '4.2',
            title: 'Términos de Respuesta Legal (Ley 1581)',
            text: 'Las consultas serán atendidas en un término máximo de diez (10) días hábiles contados a partir de su recibo. Los reclamos para rectificación o supresión serán tramitados en un término no mayor a quince (15) días hábiles.',
          },
        ],
      },
    ],
  },
  cookies: {
    badge: 'Cookies',
    title: 'Política de Cookies y Tecnologías de Almacenamiento Local',
    desc: 'Condiciones técnicas del uso de cookies esenciales y de rendimiento en la plataforma Zentric.',
    chapters: [
      {
        id: 'cook-1',
        num: 'Capítulo 1',
        title: 'Naturaleza y Finalidad de las Cookies',
        summary:
          'Define el funcionamiento de los identificadores de sesión en equipos terminales para asegurar la persistencia del carrito y la autenticación.',
        subclauses: [
          {
            code: '1.1',
            title: 'Definición Técnica',
            text: 'Una cookie es un fichero de texto descargado en el navegador del usuario al acceder a la plataforma. Su finalidad es recordar el estado de la sesión, la cesta de compras y configuraciones de navegación segura.',
          },
        ],
      },
      {
        id: 'cook-2',
        num: 'Capítulo 2',
        title: 'Tipología de Cookies Empleadas',
        summary:
          'Distingue de forma transparente entre cookies técnicas esenciales (sin las cuales la tienda no funciona) y métricas anónimas.',
        subclauses: [
          {
            code: '2.1',
            title: 'Cookies Técnicas Esenciales',
            text: 'Indispensables para el funcionamiento operativo: tokens JWT de autenticación cifrados con protocolo HttpOnly, tokens anti-falsificación CSRF y persistencia del carrito de compras. Su desactivación impide completar compras en la plataforma.',
          },
          {
            code: '2.2',
            title: 'Cookies de Rendimiento Anónimas',
            text: 'Registran datos agregados sobre latencia de carga, rendimiento del servidor y errores de red para optimizar la velocidad del sistema sin perfilar individualmente a la persona.',
          },
        ],
      },
      {
        id: 'cook-3',
        num: 'Capítulo 3',
        title: 'Gestión y Desactivación en el Navegador',
        summary:
          'Explica cómo configurar o bloquear cookies en los navegadores y advierte sobre los efectos en el proceso de compra.',
        subclauses: [
          {
            code: '3.1',
            title: 'Control por el Usuario',
            text: 'El usuario puede en cualquier momento bloquear o eliminar cookies desde la configuración de su navegador (Chrome, Firefox, Safari, Edge). Se advierte que el bloqueo de cookies esenciales inhabilitará el inicio de sesión y la reserva de productos.',
          },
        ],
      },
    ],
  },
  consumer: {
    badge: 'Consumidor',
    title: 'Régimen de Protección al Consumidor (Ley 1480 de 2011)',
    desc: 'Catálogo de derechos de los consumidores en comercio electrónico y procedimientos de reclamación ante la Superintendencia de Industria y Comercio.',
    chapters: [
      {
        id: 'cons-1',
        num: 'Capítulo 1',
        title: 'Transparencia Precontractual y Precios Totales',
        summary:
          'Obligación legal de exhibir precios finales con IVA y detallar plazos de entrega antes de la confirmación.',
        subclauses: [
          {
            code: '1.1',
            title: 'Precio Total Definitivo (Art. 50, Ley 1480)',
            text: 'El Comprador conocerá antes de autorizar el pago: el precio total exacto en moneda de curso legal (COP), el desglose del impuesto sobre las ventas (IVA) y el costo liquidado del envío a su dirección física de destino.',
          },
        ],
      },
      {
        id: 'cons-2',
        num: 'Capítulo 2',
        title: 'Mecanismo de Reversión del Pago (Decreto 587 de 2016)',
        summary:
          'Requisitos y causales taxativas para solicitar la reversión bancaria ante fraudes o fallas de entrega en un plazo de 5 días hábiles.',
        subclauses: [
          {
            code: '2.1',
            title: 'Causales de Reversión',
            text: 'Procede la reversión cuando: (a) El comprador fue víctima de fraude electrónico, (b) La transacción no fue solicitada, (c) El producto no fue recibido en el plazo acordado, o (d) El producto entregado no corresponde a lo pedido o es defectuoso.',
          },
          {
            code: '2.2',
            title: 'Trámite Concurrente',
            text: 'El consumidor presentará la queja ante Zentric y notificará simultáneamente al banco emisor de su tarjeta dentro de los cinco (5) días hábiles siguientes al conocimiento del hecho.',
          },
        ],
      },
      {
        id: 'cons-3',
        num: 'Capítulo 3',
        title: 'Autoridad de Inspección y Vigilancia (SIC)',
        summary:
          'Informa los canales oficiales de la Superintendencia de Industria y Comercio para radicar actuaciones administrativas.',
        subclauses: [
          {
            code: '3.1',
            title: 'Superintendencia de Industria y Comercio',
            text: 'La Superintendencia de Industria y Comercio (SIC) es la autoridad encargada de velar por los derechos del consumidor en Colombia. Los usuarios pueden acudir a través del portal institucional <strong>www.sic.gov.co</strong> o en su sede de Bogotá D.C. ubicada en la Carrera 13 # 27-00.',
          },
        ],
      },
    ],
  },
};
