# DevConecta: tienda virtual de paquetes de software

Tienda en línea completa para **DevConecta**. Vende paquetes de desarrollo de software (sitios web, tiendas en línea, sistemas, apps y servicios en la nube) a pymes.

- **Frontend:** React 18 + Vite, servido con Nginx
- **Backend:** Node.js 20 + Express (API REST con JWT)
- **Base de datos:** PostgreSQL 16
- **Infraestructura:** Docker Compose con 3 contenedores (`web`, `api`, `db`)

> Proyecto académico de Comercio Electrónico (UJAT). **Los pagos son simulados** y no se hace ningún cargo real.

---

## 1. Cómo levantarlo

Requisito: tener **Docker Desktop** instalado y abierto.

```bash
docker compose up --build
```

Abre **http://localhost:8080** en el navegador.

- La primera vez tarda unos minutos porque descarga imágenes e instala dependencias.
- Al arrancar, la API carga sola los datos de ejemplo: 14 paquetes, reseñas, cupones y preguntas frecuentes.

Para apagarlo:

```bash
docker compose down        # apaga y conserva los datos
docker compose down -v     # apaga y BORRA la base de datos (empieza desde cero)
```

### Cuentas de prueba

| Rol           | Correo               | Contraseña  |
|---------------|----------------------|-------------|
| Cliente       | cliente@demo.mx      | Cliente123! |
| Administrador | admin@devconecta.mx  | Admin123!   |

### Datos para probar pagos

| Método       | Qué hacer |
|--------------|-----------|
| Tarjeta      | `4242 4242 4242 4242`, cualquier fecha futura y cualquier CVV. Código 3-D Secure: **123456** |
| Tarjeta rechazada | `4000 0000 0000 0002` (simula fondos insuficientes) |
| Mercado Pago / PayPal | Se abre una ventana simulada de la pasarela; da clic en “Confirmar pago” |
| SPEI / OXXO  | Genera CLABE o referencia y el pedido queda “Anticipo pendiente”. El administrador lo confirma con “Confirmar pago” |

Cupones: `BIENVENIDA10` (10 %), `PYME500` ($500 desde $8,000), `UJAT15` (15 % desde $5,000).

### Recorrido sugerido para la presentación

1. Busca “citas” en el buscador y entra al paquete.
2. Elige plan y tecnología y agrégalo al carrito.
3. En el carrito aplica `BIENVENIDA10` y cambia a entrega prioritaria.
4. Paga como invitado con la tarjeta 4242 y el código 123456.
5. Crea una cuenta con el mismo correo; el pedido aparece en Mi cuenta.
6. Entra como administrador y mueve el pedido a la etapa **Entrega**.
7. Vuelve a entrar como cliente y paga el saldo desde el detalle del pedido.

---

## 2. Qué cubre cada sección del documento

Como DevConecta vende servicios, algunos conceptos de producto físico se adaptaron así:

- **Producto** → paquete de servicio
- **Variantes** → plan (Básico / Pro / Empresarial) y tecnología
- **Stock** → cupos disponibles en el mes
- **Envío** → tiempo de entrega (Estándar o Prioritaria)
- **Tracking del envío** → avance del proyecto por etapas

| Sección del documento | Dónde está en la tienda |
|---|---|
| **1. Página de inicio** | |
| Productos destacados y ofertas | Inicio: “Ofertas de noviembre” y “Destacados” |
| Categorías principales | Inicio: 5 categorías, más la barra de categorías del encabezado |
| Testimonios y elementos de confianza | Inicio: reseñas destacadas y 4 garantías (pago protegido, código tuyo, 5 días, CFDI) |
| Registro al boletín | Inicio y pie de página (se guarda en la tabla `subscribers`) |
| **2. Catálogo** | `/catalogo` |
| Categorías y subcategorías | Árbol de categorías en el filtro lateral y menús desplegables |
| Filtros avanzados | Precio (rangos y mín./máx.), tecnología (equivale a “marca”), características y calificación |
| Organización | Más vendidos, precio ascendente y descendente, más nuevos, mejor calificados, ofertas |
| Vista parrilla o lista | Botones de vista (la preferencia se recuerda) |
| Búsqueda inteligente con autocompletado | Buscador del encabezado: sugiere paquetes, categorías y tecnologías; funciona con teclado y sin acentos |
| **3. Página de producto** | `/producto/:slug` |
| Galería con zoom | Vistas de computadora, celular y detalle; lupa al pasar el cursor y pantalla completa |
| Descripción y especificaciones | Pestañas Descripción y Especificaciones, con tabla comparativa de planes |
| Reseñas y calificaciones | Promedio, distribución por estrellas, orden, “compra verificada” y formulario |
| Productos relacionados | “Paquetes relacionados” |
| Variantes | Plan y tecnología |
| Stock y disponibilidad | Cupos del mes y fecha de entrega estimada en tiempo real |
| **4. Carrito** | `/carrito`, más un carrito lateral rápido |
| Vista detallada | Miniatura, plan, tecnología y precios |
| Modificar cantidades | Selector +/− (meses en servicios mensuales) |
| Cálculo de envío en tiempo real | Opciones Estándar y Prioritaria con costo y fecha, cotizadas por la API |
| Códigos de descuento | Validados en el servidor |
| Guardado para registrados | El carrito se guarda en la tabla `carts` y se combina al iniciar sesión |
| **5. Checkout** | `/pago` |
| Una sola página | Tres bloques: datos, entrega y facturación, pago |
| Compra como invitado | Sí; después puede rastrear el pedido o crear su cuenta |
| Resumen claro | Paquetes, descuento, entrega, IVA, total y “Hoy pagas (anticipo 50 %)” |
| Políticas visibles | Recuadro “Antes de pagar” y casilla de aceptación con enlaces |
| Métodos de pago | Tarjeta con 3-D Secure, Mercado Pago, PayPal, SPEI y OXXO (simulados) |
| **6. Mi cuenta** | `/cuenta` |
| Historial de pedidos | Pedidos con filtros (en curso, entregados, cancelados) |
| Tracking | Línea de tiempo del proyecto: análisis → diseño → desarrollo → pruebas → entrega |
| Lista de deseos | Corazón en tarjetas y en la página de producto |
| Datos personales y direcciones | Información personal, contraseña, direcciones y datos fiscales (RFC) |
| Preferencias de comunicación | Interruptores de correo, WhatsApp, boletín y promociones |
| **7. Atención al cliente** | |
| Chat o chatbot | Botón “¿Dudas?” en todas las páginas, con respuestas por palabras clave |
| Centro de ayuda / FAQ | `/ayuda`, con buscador y categorías |
| Formulario de contacto | `/contacto` (genera un número de seguimiento; el admin lo ve) |
| Políticas claras | `/politicas/devoluciones`, `/entregas`, `/privacidad`, `/terminos` |
| Información de la empresa | `/nosotros` y la ficha de contacto |
| **Extra: administración** | `/admin`: indicadores, pedidos y etapas, confirmar pagos SPEI/OXXO, paquetes (precio, oferta, cupos), cupones, reseñas, mensajes y suscriptores |

---

## 3. Estructura

```
devconecta/
├── docker-compose.yml     # orquesta db + api + web
├── shared/
│   ├── seed.json          # datos de ejemplo (paquetes, reseñas, cupones, FAQ)
│   └── logic.mjs          # reglas de negocio compartidas: precios, entrega, cupones, IVA, pagos, chatbot
├── db/
│   ├── Dockerfile         # postgres:16-alpine + esquema
│   └── init.sql           # 12 tablas
├── api/
│   ├── Dockerfile
│   └── src/               # Express: index.js (rutas), db.js, seed.js
└── web/
    ├── Dockerfile         # build multi-etapa: Node compila, Nginx sirve
    ├── nginx.conf         # sirve la tienda y hace proxy de /api al contenedor api
    └── src/
        ├── pages/         # Inicio, Catálogo, Producto, Carrito, Checkout, Cuenta, Ayuda, Admin…
        ├── components/    # Encabezado, tarjetas, galería (Mockup), chat, pagos, seguimiento
        ├── state/         # sesión, carrito, lista de deseos, avisos
        └── lib/           # cliente de la API y backend simulado para la demo
```

### Seguridad aplicada

- Contraseñas con **bcrypt** y sesiones con **JWT**.
- La tienda **nunca guarda número de tarjeta ni CVV**; solo los últimos 4 dígitos (como hace una pasarela real).
- Todos los precios y totales se recalculan en el servidor. El navegador no puede mandar un precio falso.
- Consultas SQL parametrizadas, validación de RFC, correo, teléfono y CP, y cabeceras de seguridad en Nginx.

---

## 4. Desarrollo sin Docker (opcional)

Con PostgreSQL local y el esquema de `db/init.sql` cargado:

```bash
cd api && npm install && DB_HOST=localhost npm start   # API en :3000
cd web && npm install && npm run dev                   # tienda en :5173 (hace proxy de /api)
```

La versión demo sin servidor se compila con `npm run build:demo`. Guarda todo en el navegador.
