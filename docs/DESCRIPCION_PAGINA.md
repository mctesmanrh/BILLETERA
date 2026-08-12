# Descripción de la página — Tu Billetera

## 1. Resumen

Tu Billetera es una aplicación web personal para registrar y visualizar los
gastos mensuales de Angie y Jordan en pesos colombianos (COP). La página permite
conocer el presupuesto del mes, cuánto se ha gastado y cuánto queda disponible.

Al comenzar un mes nuevo, el periodo anterior se cierra automáticamente. Sus
movimientos pasan a un informe histórico descargable y el mes vigente vuelve a
mostrar el presupuesto completo, sin mezclar gastos entre meses.

Esta descripción refleja el comportamiento implementado al 12 de agosto de
2026. La versión local se abre en `http://127.0.0.1:3002` y la versión pública
está en `https://billetera-pearl.vercel.app`. Este alias apunta al proyecto
exclusivo `tu-billetera-angie-jordan`, cuya API usa PostgreSQL con Prisma ORM;
ya no apunta al despliegue antiguo que dependía de Supabase.

## 2. Inicio de sesión

Al entrar, la página consulta la sesión. Si no existe, muestra una pantalla de
bienvenida con el botón **Continuar con Google** y no solicita ni muestra ningún
dato financiero. Solo pueden entrar cuentas verificadas incluidas en la lista de
correos autorizados. El inicio de sesión de Production está activo y fue probado
con `mctesmanrh@gmail.com`; cualquier cuenta adicional debe agregarse tanto en
Google como en la lista privada de Vercel.

Después de iniciar sesión, la cabecera muestra la foto, nombre y correo de la
cuenta. El menú de usuario permite cerrar la sesión; al hacerlo también se borra
la caché financiera del navegador.

## 3. Navegación

La aplicación funciona como una página única y tiene cinco áreas principales:

- **Dashboard:** resumen del presupuesto y gráficos del mes vigente.
- **Movimientos:** búsqueda, filtros y detalle de los gastos activos.
- **Nuevo Gasto:** registro de un movimiento dentro del mes activo.
- **Papelera:** restauración o eliminación definitiva de gastos.
- **Informes:** copias JSON, exportación CSV e informes de meses cerrados.

En pantallas pequeñas algunos textos se ocultan, pero los iconos y las acciones
principales permanecen disponibles.

## 4. Dashboard

Es la vista inicial. Presenta:

- El nombre dinámico del mes activo.
- Presupuesto, Gastado y Disponible.
- La fórmula `Presupuesto - Gastos = Saldo disponible`.
- Un gráfico de barras con el gasto acumulado por día del mes vigente.
- Un control numérico y un deslizador para cambiar el presupuesto mensual.
- Una barra de porcentaje consumido.
- Los cinco movimientos más recientes.

Cuando el mes no tiene gastos, aparece un estado vacío y un acceso para registrar
el primero.

## 5. Nuevo Gasto

El formulario solicita monto, categoría, descripción y fecha. La fecha se inicia
con el día actual de Colombia y solo admite días pertenecientes al mes activo.
El monto debe ser un entero mayor a cero y la descripción es obligatoria.

Las categorías disponibles son:

| Código | Nombre visible |
| --- | --- |
| `alimentacion` | Alimentación |
| `transporte` | Transporte |
| `servicios` | Servicios del Hogar |
| `salud` | Salud & Farmacia |
| `entretenimiento` | Entretenimiento |
| `otros` | Otros Gastos |

## 6. Movimientos y papelera

Movimientos agrupa los gastos por fecha, permite buscar por descripción, filtrar
por categoría, ver el total diario y abrir un comprobante con el detalle.

Al eliminar un gasto se envía primero a la papelera. Desde allí se puede
restaurar, borrar de forma permanente o vaciar toda la papelera. Las acciones
destructivas requieren confirmación.

## 7. Informes y copias

La ventana **Informes** reúne cuatro capacidades:

- Descargar un respaldo JSON del estado actual.
- Restaurar un respaldo JSON.
- Exportar los gastos activos a CSV.
- Descargar el documento de cualquier mes cerrado.

El documento mensual es un archivo HTML autónomo con:

- Mes informado.
- Presupuesto, total gastado y saldo final.
- Cantidad de gastos activos y eliminados.
- Tabla de movimientos activos.
- Tabla separada de movimientos que estaban en la papelera.

El archivo puede abrirse en el navegador, imprimirse o guardarse como PDF. Su
nombre usa el formato `informe_tu_billetera_YYYY-MM.html`.

## 8. Cambio automático de mes

La página usa la zona horaria `America/Bogota`. Al abrir la aplicación o efectuar
una escritura, la API compara el mes actual con el periodo guardado en
PostgreSQL. Si cambió:

1. Archiva cada mes pendiente con su presupuesto y movimientos.
2. Guarda un resumen descargable del periodo cerrado.
3. Retira esos movimientos de la lista activa.
4. Activa el mes actual con cero gastado y el presupuesto configurado disponible.

La operación es transaccional e idempotente: varias solicitudes simultáneas no
crean cierres duplicados.

## 9. Persistencia percibida

PostgreSQL, consultado mediante Prisma ORM, es la fuente de verdad. React conserva en
`localStorage` la última respuesta válida como caché para mostrar información si
la conexión falla temporalmente, pero solo presenta una escritura como guardada
después de que Express la confirma. En producción, los datos viven dentro del
esquema aislado `billetera` del PostgreSQL Prisma ORM existente.

Los respaldos JSON siguen siendo útiles para recuperación o traslado. La
importación reemplaza los gastos dentro de una transacción y cierra de inmediato
los meses anteriores que contenga la copia.

## 10. Reglas y cálculos

- `Total gastado = suma de los gastos activos del mes`.
- `Disponible = presupuesto mensual - total gastado`.
- `Porcentaje consumido = total gastado / presupuesto × 100`.
- `Total diario = suma de gastos con la misma fecha`.
- `Total por categoría = suma de gastos de la misma categoría`.

La barra usa verde para un consumo controlado, ámbar para advertencia y rojo para
riesgo alto o saldo negativo.

## 11. Alcance actual

La versión actual administra una billetera compartida y una moneda. No incluye
ingresos, varias billeteras, edición de gastos, presupuestos por categoría,
gastos recurrentes ni permisos distintos por persona. Sí incluye autenticación
propia con Google; las cuentas autorizadas comparten la misma billetera.

El respaldo financiero del 1 de agosto ya corrigió julio localmente a 28 gastos,
2 eliminados y 776.100 COP. Todavía no está en producción y solo debe
transferirse con autorización explícita para Prisma Postgres remoto.
