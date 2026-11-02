# Tu Billetera

Aplicación web personal para controlar el presupuesto mensual de Angie y Jordan.
El cliente está construido con React, la API con Express y la fuente de verdad es
PostgreSQL, consultado mediante **Prisma ORM**. Localmente usa `tu_billetera`; en
producción usa el recurso existente **Prisma Postgres** con esquemas exclusivos
`billetera` y `billetera_auth`. El acceso web se protege con Google mediante
Auth.js.

## Requisitos

- Node.js 22 o posterior.
- PostgreSQL 18 o compatible.
- npm.

En este computador están instalados Node.js 26.5.0, npm 11.17.0 y PostgreSQL
18.4 mediante Homebrew.

## Preparación local

1. Inicia PostgreSQL:

   ```bash
   brew services start postgresql@18
   ```

2. Crea la base una sola vez:

   ```bash
   createdb -h 127.0.0.1 tu_billetera
   ```

3. Crea `.env.local`:

   ```dotenv
   DATABASE_URL="postgresql://127.0.0.1:5432/tu_billetera"
   HOST="127.0.0.1"
   PORT="3002"
   AUTH_SECRET="una-clave-aleatoria-larga"
   AUTH_GOOGLE_ID="cliente-oauth-de-google"
   AUTH_GOOGLE_SECRET="secreto-oauth-de-google"
   AUTH_ALLOWED_EMAILS="correo1@gmail.com,correo2@gmail.com"
   AUTH_LOCAL_BYPASS="false"
   ```

4. Instala dependencias y aplica las migraciones:

   ```bash
   npm install
   npm run db:migrate
   ```

5. Ejecuta la aplicación:

   ```bash
   npm run dev
   ```

Abre [http://127.0.0.1:3002](http://127.0.0.1:3002). En este computador Billetera
usa exclusivamente el puerto 3002; GRANJITA ocupa el 3000 y COMPRAS el 3001.
El servidor escucha solo en `127.0.0.1` para no exponer la API a la red local.
Durante desarrollo local puede usarse `AUTH_LOCAL_BYPASS="true"`; este atajo
solo funciona en loopback y nunca se acepta en Vercel.

Si Safari conserva “no puede conectarse al servidor”, comprobar primero que
`launchctl print gui/$(id -u)/com.jordan.tu-billetera` muestre el servicio en
estado `running` y que `lsof -nP -iTCP:3002 -sTCP:LISTEN` muestre su proceso.
Reiniciar únicamente Billetera con:

```bash
launchctl kickstart -k gui/$(id -u)/com.jordan.tu-billetera
```

No cambiar de puerto ni detener las otras aplicaciones.

## Servicio permanente en macOS

El archivo `scripts/macos/com.jordan.tu-billetera.plist` define el LaunchAgent
exclusivo `com.jordan.tu-billetera`. Está instalado en
`~/Library/LaunchAgents`, arranca al iniciar sesión y usa `KeepAlive` para volver
a levantar el servidor si termina inesperadamente.

Después de modificar código, recompilar y reiniciar el servicio:

```bash
npm run check
npm run db:migrate
launchctl kickstart -k gui/$(id -u)/com.jordan.tu-billetera
```

Los registros están en `/private/tmp/tu-billetera-launchd.out.log` y
`/private/tmp/tu-billetera-launchd.err.log`.

## Producción local

```bash
npm run check
npm start
```

Comprobación de la API:

```bash
curl http://127.0.0.1:3002/api/health
```

Respuesta esperada:

```json
{
  "status": "ok",
  "database": "postgresql",
  "orm": "prisma",
  "auth": { "provider": "google", "configured": true }
}
```

## Cierre mensual

La API comprueba el mes de Colombia en cada carga y antes de las escrituras. Al
detectar un mes nuevo, PostgreSQL ejecuta `rollover_wallet_month` dentro de una
transacción: guarda el presupuesto, los gastos y la papelera del mes cerrado en
`monthly_archives`, elimina esos movimientos del periodo activo y habilita el
nuevo mes con el presupuesto completo.

Los informes históricos se descargan desde la opción **Informes** como un
documento HTML que puede abrirse, imprimirse o guardarse como PDF.

## Inicio de sesión con Google

La aplicación acepta únicamente cuentas de Google cuyo correo esté incluido en
`AUTH_ALLOWED_EMAILS`. Las sesiones se guardan en PostgreSQL mediante Prisma. El
cliente OAuth debe registrar exactamente este callback de producción:

```text
https://billetera-pearl.vercel.app/api/auth/callback/google
```

Las rutas financieras `/api/*` exigen una sesión; solo `/api/health`,
`/api/session` y el flujo `/api/auth/*` son públicos.

## Despliegue

El proyecto exclusivo de Vercel es `mctesman/tu-billetera-angie-jordan`. La
versión vigente del 2 de noviembre de 2026 está desplegada en
`https://billetera-pearl.vercel.app`. El alias pertenece al proyecto exclusivo y
sirve la versión PostgreSQL/Prisma, sin consultar Supabase. Google OAuth está
configurado para `mctesmanrh@gmail.com` y `giozulsanty2013@gmail.com`. La página
pública conserva cerradas las rutas financieras mediante Auth.js.
`/api/health` expone únicamente la cantidad de correos cargados, no sus valores;
en Production debe indicar `allowedEmailCount: 2` mientras estas dos cuentas
sean las únicas autorizadas.

Producción usa el recurso existente `prisma-postgres-indigo-tree` de Prisma
Postgres. La conexión está asignada al proyecto de Billetera solo en el entorno
Production. Aunque la instancia también contiene tablas de otra aplicación en
`public`, todo el estado de esta aplicación reside en `billetera.*`; COMPRAS no
está conectado a este proyecto ni a su host.

Las migraciones remotas, incluida `003_prisma_auth.sql`, se ejecutan sin imprimir
secretos:

```bash
BILLETERA_ENV_FILE=.env.vercel.production.local npm run db:migrate
npm run check
npx --yes vercel@latest pull --yes --environment production --scope mctesman
npx --yes vercel@latest build --prod --yes --scope mctesman
npx --yes vercel@latest deploy --prebuilt --prod --skip-domain --yes --scope mctesman
```

Usar `--skip-domain` mientras se comprueba una versión protegida. Después de
comprobar Google Auth, promover el despliegue aprobado con `vercel promote`; no
limitarse a asignar el alias a una versión aislada.
El callback es `https://billetera-pearl.vercel.app/api/auth/callback/google`.
Una solicitud anónima a `/api/data` responde `401`; el host es público, pero los
datos financieros no lo son.

Los archivos `.env.vercel.production.local`, `.vercel/` y cualquier `.env*`
real están ignorados por Git. El 12 de agosto de 2026 se transfirieron a
Production únicamente los 12 gastos activos del respaldo de esa fecha, por un
total de 649.200 COP. El presupuesto remoto permaneció en 1.500.000 COP y no se
reemplazaron el mes activo, los informes, la papelera ni las sesiones.

El importador específico es idempotente, omite identificadores ya existentes y
se ejecuta primero en simulación. Para Production:

```bash
BILLETERA_ENV_FILE=.vercel/.env.production.local npm run db:import-expenses -- /ruta/al/respaldo.json --production
BILLETERA_ENV_FILE=.vercel/.env.production.local npm run db:import-expenses -- /ruta/al/respaldo.json --production --apply
```

La segunda simulación del respaldo ya aplicado omitió los 12 identificadores y
confirmó que no crea duplicados. No registrar descripciones ni secretos en la
salida o en la documentación.

La arquitectura y los contratos completos están en
`docs/ARQUITECTURA_TECNICA.md`.
