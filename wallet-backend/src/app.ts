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

  if (!fromId || !toId || !amountCents) {
    return res.status(400).json({ error: "fromId, toId and amountCents are required" });
  }

  if (fromId === toId) {
    return res.status(400).json({ error: "Cannot transfer to the same account" });
  }

  if (!Number.isInteger(amountCents) || amountCents <= 0) {
    return res.status(400).json({ error: "amountCents must be a positive integer" });
  }

  try {
    await prisma.$transaction(async (tx) => {
      const accounts = await tx.$queryRaw<
        { id: string; balanceCents: number }[]
      >`
        SELECT id, "balanceCents"
        FROM "Account"
        WHERE id IN (${fromId}, ${toId})
        ORDER BY id
        FOR UPDATE
      `;

      const from = accounts.find((account) => account.id === fromId);
      const to = accounts.find((account) => account.id === toId);

      if (!from) {
        throw new Error("SENDER_NOT_FOUND");
      }

      if (!to) {
        throw new Error("RECEIVER_NOT_FOUND");
      }

      if (from.balanceCents < amountCents) {
        throw new Error("INSUFFICIENT_BALANCE");
      }

      await tx.account.update({
        where: { id: fromId },
        data: {
          balanceCents: {
            decrement: amountCents,
          },
        },
      });

      await tx.account.update({
        where: { id: toId },
        data: {
          balanceCents: {
            increment: amountCents,
          },
        },
      });
    });

    return res.json({
      message: "Transfer successful",
      fromId,
      toId,
      amountCents,
    });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "SENDER_NOT_FOUND") {
        return res.status(404).json({ error: "Sender account not found" });
      }

      if (error.message === "RECEIVER_NOT_FOUND") {
        return res.status(404).json({ error: "Receiver account not found" });
      }

      if (error.message === "INSUFFICIENT_BALANCE") {
        return res.status(422).json({ error: "Insufficient balance" });
      }
    }

    return res.status(500).json({ error: "Transfer failed" });
  }
});

app.listen(3000, () => {
  console.log("Server running on port 3000");
});