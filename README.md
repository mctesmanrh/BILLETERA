# Tu Billetera

Aplicación web de Angie y Jordan para registrar gastos, controlar el presupuesto
mensual y conservar la información en Supabase.

## Requisitos

- Node.js 22 o superior.
- Un proyecto Supabase con las migraciones de `supabase/migrations/`.
- Una clave secreta de Supabase guardada únicamente en el servidor.

## Configuración local

1. Abre Supabase y entra al proyecto `ykjemmwzkhgjvxgjkmoh`.
2. Ve a **Settings > API Keys**.
3. Copia una clave secreta moderna con prefijo `sb_secret_`.
4. Pégala en `.env.local`:

   ```dotenv
   SUPABASE_URL="https://ykjemmwzkhgjvxgjkmoh.supabase.co"
   SUPABASE_SECRET_KEY="sb_secret_..."
   PORT="3000"
   ```

La clave secreta no debe llevar el prefijo `VITE_`, no debe importarse en
componentes React y no debe subirse al repositorio.

## Ejecución

```bash
npm install
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

Para comprobar la conexión:

```bash
curl http://localhost:3000/api/health
```

La respuesta correcta es:

```json
{ "status": "ok", "database": "supabase" }
```

## Verificación y producción

```bash
npm run check
npm start
```

`npm run check` ejecuta TypeScript y genera la compilación completa.
`npm start` sirve la compilación de producción desde `dist/`.

## Base de datos

- `wallet_settings`: presupuesto único de la billetera.
- `expenses`: gastos activos y gastos con borrado lógico.
- `replace_wallet_snapshot`: restauración atómica de una copia JSON.

Las tablas tienen RLS activado y no conceden acceso a `anon` ni
`authenticated`. El único acceso de la aplicación ocurre desde Express con
la clave secreta de servidor.

Consulta [la arquitectura técnica](docs/ARQUITECTURA_TECNICA.md) para conocer
los contratos, rutas y decisiones de seguridad.
