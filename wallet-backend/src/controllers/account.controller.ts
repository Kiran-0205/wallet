import { Request, Response } from "express";

import { prisma } from "../lib/prisma";

type AccountParams = {
  id: string;
};

export async function addMoney(req: Request<AccountParams>, res: Response) {
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
}

export async function getBalance(req: Request<AccountParams>, res: Response) {
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
}
