import { closePrismaClient, getPrismaClient } from "../src/server/prisma.js";

const LEGACY_OWNER_ID = "legacy-shared-wallet";

async function main(): Promise<void> {
  const ownerEmail = (process.env.BILLETERA_OWNER_EMAIL || "").trim();
  const apply = process.argv.includes("--apply");
  const production = process.argv.includes("--production");

  if (!ownerEmail) {
    throw new Error("BILLETERA_OWNER_EMAIL es obligatorio.");
  }
  if (production && process.env.VERCEL_ENV !== "production") {
    throw new Error(
      "La confirmación --production exige variables de Vercel Production.",
    );
  }

  const prisma = getPrismaClient();
  const owner = await prisma.user.findFirst({
    where: { email: { equals: ownerEmail, mode: "insensitive" } },
    select: { id: true },
  });
  if (!owner) throw new Error("No existe el usuario Auth.js indicado.");

  const result = await prisma.$transaction(async (transaction) => {
    await transaction.$queryRaw`
      select 1 as locked
      from (
        select pg_advisory_xact_lock(hashtext('tu-billetera-wallet-ownership'))
      ) as wallet_ownership_lock
    `;

    const [legacySettings, targetSettings, legacyExpenses, legacyArchives] =
      await Promise.all([
        transaction.walletSettings.findUnique({
          where: { ownerId: LEGACY_OWNER_ID },
          select: { id: true },
        }),
        transaction.walletSettings.findUnique({
          where: { ownerId: owner.id },
          select: { id: true },
        }),
        transaction.expenseRecord.count({
          where: { ownerId: LEGACY_OWNER_ID },
        }),
        transaction.monthlyArchive.count({
          where: { ownerId: LEGACY_OWNER_ID },
        }),
      ]);

    if (!legacySettings) {
      return {
        status: targetSettings ? "already-claimed" : "no-legacy-wallet",
        expenses: legacyExpenses,
        archives: legacyArchives,
      };
    }
    if (targetSettings) {
      throw new Error(
        "La cuenta destino ya tiene billetera; no se mezclaron los datos históricos.",
      );
    }
    if (!apply) {
      return {
        status: "dry-run",
        expenses: legacyExpenses,
        archives: legacyArchives,
      };
    }

    await transaction.walletSettings.update({
      where: { id: legacySettings.id },
      data: { ownerId: owner.id, updatedAt: new Date() },
    });
    await transaction.expenseRecord.updateMany({
      where: { ownerId: LEGACY_OWNER_ID },
      data: { ownerId: owner.id },
    });
    await transaction.monthlyArchive.updateMany({
      where: { ownerId: LEGACY_OWNER_ID },
      data: { ownerId: owner.id },
    });

    return {
      status: "claimed",
      expenses: legacyExpenses,
      archives: legacyArchives,
    };
  }, { maxWait: 5_000, timeout: 15_000 });

  console.log(JSON.stringify(result));
}

try {
  await main();
} finally {
  await closePrismaClient();
}
