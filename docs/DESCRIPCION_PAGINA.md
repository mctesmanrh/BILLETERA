# Descripción de la página — Tu Billetera

## 1. Resumen

Tu Billetera es una aplicación web personal para registrar y visualizar los gastos mensuales de Angie y Jordan en pesos colombianos (COP). Su objetivo es responder rápidamente tres preguntas:

1. ¿Cuál es el presupuesto mensual?
2. ¿Cuánto se ha gastado?
3. ¿Cuánto dinero queda disponible?

La interfaz también permite consultar movimientos, analizar el gasto por día y categoría, eliminar o restaurar registros y descargar copias de seguridad.

Esta descripción refleja el comportamiento implementado en el código al 29 de julio de 2026. Los límites técnicos y las diferencias entre la intención y el funcionamiento actual se detallan en `docs/ARQUITECTURA_TECNICA.md`.

## 2. Público y propósito

La página está planteada como una billetera compartida, sencilla y doméstica para Angie y Jordan. No es una plataforma bancaria ni contable: se concentra en controlar un único presupuesto y una lista común de gastos.

Sus objetivos de uso son:

- Registrar un gasto en pocos pasos.
- Conocer el saldo restante sin hacer cálculos manuales.
- Identificar los días y las categorías con mayor consumo.
- Buscar gastos anteriores.
- Recuperar un gasto borrado por error.
- Conservar o trasladar la información mediante archivos JSON y CSV.

## 3. Estructura general

La aplicación funciona como una página única. Las secciones cambian dentro de la misma pantalla y no tienen URL propia.

### Encabezado y navegación

El encabezado muestra:

- Un ícono de alcancía.
- El título “GASTOS MENSUALES ANGIE Y JORDAN”.
- El mensaje “Control rápido e inteligente de tus gastos”.
- Accesos a Dashboard, Movimientos, Nuevo Gasto, Papelera y Copia PC.

En pantallas pequeñas se ocultan algunos textos de navegación, pero se conservan los íconos y las acciones principales.

### Dashboard

Es la vista inicial y presenta el estado general del presupuesto.

Incluye:

- Un botón principal para registrar un gasto.
- Tres tarjetas con Presupuesto, Gastado y Disponible.
- Una barra que explica la fórmula `Presupuesto - Gastos = Saldo disponible`.
- Un gráfico de barras con el monto acumulado por día.
- Un control numérico y un deslizador para modificar el límite mensual.
- Una barra de presupuesto consumido con alertas de estado.
- Una lista de los cinco movimientos más recientes.

Cuando no existen gastos, el gráfico se reemplaza por un estado vacío con un llamado a registrar el primer gasto.

### Nuevo Gasto

El formulario solicita:

- Monto en COP.
- Una de las seis categorías disponibles.
- Descripción del gasto.
- Fecha, inicializada con la fecha actual de Colombia.

El monto se muestra con separadores de miles. La validación visible exige que el monto sea mayor que cero y que exista una descripción. Al guardar, la interfaz vuelve al Dashboard.

### Movimientos

Esta vista muestra todos los gastos activos ordenados del más reciente al más antiguo y agrupados por fecha.

Permite:

- Buscar por descripción.
- Filtrar por categoría.
- Ver el total gastado de cada día.
- Desplegar un Top 5 de categorías por monto.
- Abrir el detalle de cualquier movimiento.

Si los filtros no producen resultados, aparece un mensaje específico. Si la billetera completa está vacía, la aplicación presenta un estado vacío con acceso directo al formulario.

### Detalle de un gasto

El detalle simula un comprobante y contiene:

- Identificador interno.
- Categoría e ícono.
- Monto.
- Descripción.
- Fecha.
- Acción para enviar el registro a la papelera.

La eliminación requiere una confirmación previa.

### Papelera

Los gastos eliminados se trasladan primero a una papelera recuperable.

Desde esta vista se puede:

- Consultar el monto total y la cantidad de elementos eliminados.
- Restaurar un gasto a la lista principal.
- Eliminar un gasto de forma permanente, con confirmación.
- Vaciar toda la papelera, también con confirmación.

El encabezado muestra una insignia con la cantidad de elementos en la papelera.

### Copia de seguridad en el PC

La opción “Copia PC” abre una ventana modal con tres acciones:

- Descargar un respaldo JSON con presupuesto, gastos activos y gastos eliminados.
- Cargar un respaldo JSON para restaurar los datos.
- Exportar los gastos activos a CSV para Excel o Google Sheets.

La ventana explica que Supabase conserva la información principal y que el JSON funciona como respaldo adicional para recuperación o traslado.

## 4. Información y cálculos visibles

La página utiliza estas reglas:

- `Total gastado = suma de los montos de todos los gastos activos`.
- `Saldo disponible = presupuesto mensual - total gastado`.
- `Porcentaje consumido = total gastado / presupuesto × 100`.
- `Total diario = suma de los gastos con la misma fecha`.
- `Total por categoría = suma de los gastos de una misma categoría`.

La barra de consumo usa tres estados visuales:

- Controlado: hasta el 70 %.
- Advertencia: más del 70 %.
- Riesgo alto: más del 90 % o saldo negativo.

El texto de estado cambia nuevamente al superar el 80 %, por lo que el color de la barra y el mensaje no comparten exactamente el mismo umbral.

## 5. Categorías

| Código interno | Nombre visible | Color principal |
| --- | --- | --- |
| `alimentacion` | Alimentación | Verde |
| `transporte` | Transporte | Ámbar |
| `servicios` | Servicios del Hogar | Azul |
| `salud` | Salud & Farmacia | Rosa |
| `entretenimiento` | Entretenimiento | Morado |
| `otros` | Otros Gastos | Gris |

Las categorías son fijas; la interfaz actual no permite crearlas, renombrarlas ni eliminarlas.

## 6. Diseño visual y comportamiento adaptable

La identidad visual sigue un estilo limpio y minimalista:

- Fondo gris muy claro y tarjetas blancas.
- Bordes suaves, esquinas ampliamente redondeadas y sombras discretas.
- Gris pizarra como color principal.
- Rosa/rojo para gasto y eliminación.
- Verde, ámbar y rojo para comunicar el estado del presupuesto.
- Tipografía Plus Jakarta Sans para la interfaz y JetBrains Mono para cifras e identificadores.
- Íconos de Lucide y transiciones con Motion.

En escritorio, el Dashboard organiza el gráfico y los controles en dos columnas. En móvil, las tarjetas, formularios y paneles se apilan verticalmente.

## 7. Persistencia percibida por el usuario

Los datos se conservan en dos niveles:

- En Supabase PostgreSQL como fuente principal.
- En el almacenamiento local del navegador como caché de respaldo para mostrar la última información conocida si se pierde temporalmente la conexión.

La página muestra primero la caché del navegador y luego la reemplaza con la respuesta de Supabase. Un gasto nuevo solo aparece como guardado después de que el servidor confirma la escritura. Las operaciones de papelera también actualizan la interfaz con el estado devuelto por el servidor.

La importación de un JSON reemplaza el presupuesto y los gastos dentro de una transacción de base de datos. Cerrar la pestaña ya no envía copias completas ni puede sobrescribir silenciosamente cambios más recientes.

En el despliegue de Vercel, las rutas `/api/*` se ejecutan como una Function de
Node.js y reciben la configuración de Supabase únicamente desde variables de
entorno de Producción. Por eso los cambios realizados desde la web desplegada y
desde la ejecución local comparten la misma fuente de verdad.

Si Supabase no está configurado, si se intenta usar una clave publicable en el
servidor o si la base no responde, aparece una alerta visible y la aplicación
conserva la última caché local para consulta.

## 8. Recorrido principal

1. Abrir la aplicación y revisar Presupuesto, Gastado y Disponible.
2. Ajustar el límite mensual si es necesario.
3. Seleccionar “Registrar Gasto” o “Nuevo Gasto”.
4. Completar monto, categoría, descripción y fecha.
5. Guardar y volver al Dashboard.
6. Consultar el gráfico, el porcentaje consumido y los últimos movimientos.
7. Entrar a Movimientos para buscar, filtrar o abrir un detalle.
8. Enviar un gasto a la papelera, restaurarlo o eliminarlo definitivamente.
9. Descargar periódicamente una copia JSON o una tabla CSV.

## 9. Alcance actual

La versión actual cubre presupuesto y gastos, pero no incluye:

- Ingresos o depósitos.
- Varias cuentas, billeteras o monedas.
- Edición de un gasto ya creado.
- Presupuestos por categoría.
- Cambio de mes o historial mensual separado.
- Gastos recurrentes.
- Metas de ahorro, deudas o reportes contables.
- Usuarios, inicio de sesión, permisos o privacidad por persona.
- Sincronización segura entre varias parejas o grupos.

La base de datos está cerrada al acceso directo público y el despliegue vigente
está protegido por Vercel Authentication. La API Express no incluye autenticación
propia, así que esa protección debe mantenerse; antes de hacer el sitio público
se debe añadir autenticación y autorización dentro de la aplicación.

Aunque la interfaz habla de un presupuesto mensual y muestra “Julio 2026”, los cálculos actuales suman todos los gastos cargados, sin filtrar por mes. El gráfico también agrega por defecto los días 1 al 14 de julio de 2026, la fecha actual de Colombia y cualquier otra fecha encontrada.

## 10. Glosario

- **Presupuesto:** límite de dinero configurado.
- **Gastado:** suma de todos los registros activos.
- **Disponible:** diferencia entre presupuesto y gastado.
- **Movimiento:** gasto individual.
- **Papelera:** almacenamiento temporal de gastos eliminados.
- **Copia JSON:** respaldo completo que puede restaurarse.
- **CSV:** tabla de gastos activos para una hoja de cálculo.
