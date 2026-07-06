import express from "express";
import { prisma } from "./prisma";

const app = express();

app.get("/health", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;

    res.status(200).json({
      status: "ok",
      db: "connected",
    });
  } catch {
    res.status(500).json({
      status: "error",
      db: "disconnected",
    });
  }
});

app.use(express.json());

app.post("/users", async (req, res) => {
  const { email } = req.body;

  const user = await prisma.user.create({
    data: {
      email,
      account: {
        create: {
          balanceCents: 0,
        },
      },
    },
    include: {
      account: true,
    },
  });

  res.status(201).json(user);
});

app.post("/accounts/:id/add-money", async (req, res) => {
  const { amountCents } = req.body;

  const account = await prisma.account.update({
    where: {
      id: req.params.id,
    },
    data: {
      balanceCents: {
        increment: amountCents,
      },
    },
  });

  res.json(account);
});

app.get("/accounts/:id/balance", async (req, res) => {
  const account = await prisma.account.findUnique({
    where: {
      id: req.params.id,
    },
  });

  if (!account) {
    return res.status(404).json({ error: "Account not found" });
  }

  res.json({
    accountId: account.id,
    balanceCents: account.balanceCents,
  });
});

app.post("/transfer", async (req, res) => {
  const { fromId, toId, amountCents } = req.body;

  const from = await prisma.account.findUnique({
    where: {
      id: fromId,
    },
  });

  if (!from) {
    return res.status(404).json({ error: "Sender account not found" });
  }

  if (from.balanceCents < amountCents) {
    return res.status(422).json({ error: "Insufficient balance" });
  }

  await prisma.account.update({
    where: {
      id: fromId,
    },
    data: {
      balanceCents: {
        decrement: amountCents,
      },
    },
  });

  await prisma.account.update({
    where: {
      id: toId,
    },
    data: {
      balanceCents: {
        increment: amountCents,
      },
    },
  });

  res.json({
    message: "Transfer successful",
    fromId,
    toId,
    amountCents,
  });
});

app.listen(3000, () => {
  console.log("Server running on port 3000");
});