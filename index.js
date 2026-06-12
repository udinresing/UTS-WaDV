// Nama: Anandra Syarifudin
// NIM: 24120400007

const express = require("express");
const { PrismaClient } = require("@prisma/client");

const app = express();
const PORT = 3000;

const prisma = new PrismaClient();

app.use(express.json());

// ==========================================
// SOAL 1 — Wallet Endpoints
// ==========================================

// 1a. GET /wallets
// Kembalikan semua wallet, diurutkan dari yang paling baru dibuat
app.get("/wallets", async (req, res) => {
  try {
    const wallets = await prisma.wallet.findMany({
      orderBy: { createdAt: "desc" }
    });
    res.json(wallets);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 1b. POST /wallets
// Buat wallet baru. Field name wajib ada.
app.post("/wallets", async (req, res) => {
  try {
    const { name, currency } = req.body;
    
    if (!name || name.trim() === "") {
      return res.status(400).json({ error: "name wajib diisi" });
    }

    const data = { name };
    if (currency) data.currency = currency;

    const wallet = await prisma.wallet.create({
      data
    });
    res.status(201).json(wallet);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 1c. DELETE /wallets/:id
// Hapus wallet beserta seluruh transaksinya.
app.delete("/wallets/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    // Cek apakah wallet ada
    const wallet = await prisma.wallet.findUnique({ where: { id } });
    if (!wallet) {
      return res.status(404).json({ error: "Wallet tidak ditemukan" });
    }

    // Hapus transaksinya dulu, baru walletnya
    await prisma.transaction.deleteMany({
      where: { walletId: id }
    });

    await prisma.wallet.delete({
      where: { id }
    });

    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// SOAL 2 — Transaction Endpoints
// ==========================================

// 2a. GET /wallets/:id/transactions
// Kembalikan semua transaksi milik wallet tertentu, diurutkan descending date.
app.get("/wallets/:id/transactions", async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    const wallet = await prisma.wallet.findUnique({ where: { id } });
    if (!wallet) {
      return res.status(404).json({ error: "Wallet tidak ditemukan" });
    }

    const transactions = await prisma.transaction.findMany({
      where: { walletId: id },
      orderBy: { date: "desc" }
    });

    res.json(transactions);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 2b. POST /wallets/:id/transactions
// Tambah transaksi baru. Validasi ketat.
app.post("/wallets/:id/transactions", async (req, res) => {
  try {
    const walletId = parseInt(req.params.id);

    const wallet = await prisma.wallet.findUnique({ where: { id: walletId } });
    if (!wallet) {
      return res.status(404).json({ error: "Wallet tidak ditemukan" });
    }

    const { amount, type, category, date, note } = req.body;

    // Validasi field wajib
    if (amount === undefined || !type || !category || !date) {
      return res.status(400).json({ error: "amount, type, category, dan date wajib diisi" });
    }

    // Validasi type
    if (type !== "income" && type !== "expense") {
      return res.status(400).json({ error: "type harus \"income\" atau \"expense\"" });
    }

    // Validasi amount
    if (amount <= 0) {
      return res.status(400).json({ error: "amount harus lebih dari 0" });
    }

    const transaction = await prisma.transaction.create({
      data: {
        amount,
        type,
        category,
        date: new Date(date),
        note: note || null,
        walletId
      }
    });

    res.status(201).json(transaction);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 2c. DELETE /transactions/:id
// Hapus satu transaksi dan kembalikan response bonus (+5 poin)
app.delete("/transactions/:id", async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    // Cari transaksi untuk mengetahui namanya dan untuk validasi
    const transaction = await prisma.transaction.findUnique({
      where: { id },
      include: { wallet: true } // ambil data relasi wallet
    });

    if (!transaction) {
      return res.status(404).json({ error: "Transaksi tidak ditemukan" });
    }

    await prisma.transaction.delete({
      where: { id }
    });

    // Menghilangkan walletId karena object terluar sudah ada
    // Untuk menyamai response struktur: "wallet": { "name": ... }
    res.status(200).json({
      deleted: {
        id: transaction.id,
        amount: transaction.amount,
        type: transaction.type,
        category: transaction.category,
        note: transaction.note,
        date: transaction.date,
        createdAt: transaction.createdAt,
        walletId: transaction.walletId,
        wallet: {
          name: transaction.wallet.name
        }
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
// SOAL 3 — Balance & Summary
// ==========================================

// 3a. GET /wallets/:id/balance
app.get("/wallets/:id/balance", async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    const wallet = await prisma.wallet.findUnique({
      where: { id },
      include: { transactions: true }
    });

    if (!wallet) {
      return res.status(404).json({ error: "Wallet tidak ditemukan" });
    }

    let totalIncome = 0;
    let totalExpense = 0;

    for (const trx of wallet.transactions) {
      if (trx.type === "income") {
        totalIncome += trx.amount;
      } else if (trx.type === "expense") {
        totalExpense += trx.amount;
      }
    }

    const balance = totalIncome - totalExpense;

    res.json({
      walletId: wallet.id,
      walletName: wallet.name,
      totalIncome,
      totalExpense,
      balance
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 3b. GET /wallets/:id/summary
app.get("/wallets/:id/summary", async (req, res) => {
  try {
    const id = parseInt(req.params.id);

    const wallet = await prisma.wallet.findUnique({
      where: { id },
      include: { transactions: true }
    });

    if (!wallet) {
      return res.status(404).json({ error: "Wallet tidak ditemukan" });
    }

    // Mengelompokkan transaksi per kategori menggunakan Map
    const map = new Map();

    for (const trx of wallet.transactions) {
      if (!map.has(trx.category)) {
        map.set(trx.category, {
          category: trx.category,
          count: 0,
          totalAmount: 0,
          incomeCount: 0,
          expenseCount: 0
        });
      }

      const group = map.get(trx.category);
      group.count += 1;
      group.totalAmount += trx.amount;
      
      if (trx.type === "income") {
        group.incomeCount += 1;
      } else {
        group.expenseCount += 1;
      }
    }

    // Membentuk array response akhir
    const summaryArray = Array.from(map.values()).map(group => {
      // Pembulatan avg 2 desimal
      const rawAvg = group.totalAmount / group.count;
      const avgAmount = Math.round(rawAvg * 100) / 100;

      return {
        category: group.category,
        count: group.count,
        totalAmount: group.totalAmount,
        avgAmount: avgAmount,
        types: {
          income: group.incomeCount,
          expense: group.expenseCount
        }
      };
    });

    res.json({
      walletId: wallet.id,
      walletName: wallet.name,
      summary: summaryArray
    });

  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ==========================================
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
