const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  console.log("Seeding database...");

  // Hapus data lama agar tidak duplikat saat di-seed ulang
  await prisma.transaction.deleteMany();
  await prisma.wallet.deleteMany();

  // Wallets
  const w1 = await prisma.wallet.create({
    data: { name: "BCA Tabungan", currency: "IDR" }
  });
  const w2 = await prisma.wallet.create({
    data: { name: "Cash", currency: "IDR" }
  });

  // Transactions Wallet 1
  await prisma.transaction.createMany({
    data: [
      { amount: 1000000, type: "income", category: "initial_balance", date: new Date("2025-01-01T00:00:00Z"), walletId: w1.id, note: "Saldo Awal" },
      { amount: 5000000, type: "income", category: "salary", date: new Date("2025-01-05T00:00:00Z"), walletId: w1.id },
      { amount: 45000, type: "expense", category: "food", date: new Date("2025-01-06T00:00:00Z"), walletId: w1.id },
      { amount: 25000, type: "expense", category: "transport", date: new Date("2025-01-07T00:00:00Z"), walletId: w1.id },
      { amount: 80000, type: "expense", category: "food", date: new Date("2025-01-10T00:00:00Z"), walletId: w1.id },
      { amount: 500000, type: "income", category: "freelance", date: new Date("2025-01-15T00:00:00Z"), walletId: w1.id },
    ]
  });

  // Transactions Wallet 2
  await prisma.transaction.createMany({
    data: [
      { amount: 1000000, type: "income", category: "initial_balance", date: new Date("2025-01-01T00:00:00Z"), walletId: w2.id, note: "Saldo Awal" },
      { amount: 200000, type: "income", category: "salary", date: new Date("2025-01-05T00:00:00Z"), walletId: w2.id },
      { amount: 30000, type: "expense", category: "food", date: new Date("2025-01-08T00:00:00Z"), walletId: w2.id },
    ]
  });

  console.log("Seeding completed.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
