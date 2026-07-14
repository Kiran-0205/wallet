import { Request, Response } from "express";

import { prisma } from "../lib/prisma";
import { LedgerTransactionType, Prisma } from "@prisma/client";

type AccountParams = {
  id: string;
};

type LockedAccount = {
  id: string;
  balanceCents: number;
};

export async function fund(req: Request<AccountParams>, res: Response) {
  const accountId = req.params.id;
  const { amountCents } = req.body;

  const treasuryAccountId = process.env.TREASURY_ACCOUNT_ID;

  if (!treasuryAccountId) {
    return res.status(500).json({
      error: "Treasury account is not configured",
    });
  }

  if (!Number.isInteger(amountCents) || amountCents <= 0) {
    return res.status(400).json({
      error: "amountCents must be a positive integer",
    });
  }

  if (accountId === treasuryAccountId) {
    return res.status(400).json({
      error: "Cannot fund the treasury account",
    });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      /*
       * Lock both accounts in the same consistent order
       * used by the transfer function.
       */
      const lockedAccounts = await tx.$queryRaw<LockedAccount[]>`
        SELECT id, "balanceCents"
        FROM "Account"
        WHERE id = ${treasuryAccountId}
           OR id = ${accountId}
        ORDER BY id
        FOR UPDATE
      `;

      const treasuryAccount = lockedAccounts.find(
        (account) => account.id === treasuryAccountId,
      );

      const fundedAccount = lockedAccounts.find(
        (account) => account.id === accountId,
      );

      if (!treasuryAccount) {
        return {
          statusCode: 500,
          body: {
            error: "Configured treasury account does not exist",
          },
        };
      }

      if (!fundedAccount) {
        return {
          statusCode: 404,
          body: {
            error: "Account not found",
          },
        };
      }

      /*
       * Treasury: -amountCents
       * User:     +amountCents
       *
       * Total: 0
       */
      const ledgerTransaction = await tx.ledgerTransaction.create({
        data: {
          type: LedgerTransactionType.FUNDING,
          entries: {
            create: [
              {
                accountId: treasuryAccountId,
                amountCents: -amountCents,
              },
              {
                accountId,
                amountCents,
              },
            ],
          },
        },
        select: {
          id: true,
        },
      });

      /*
       * Keep the cached balances synchronized with the ledger.
       * The treasury is intentionally allowed to become negative.
       */
      await tx.account.update({
        where: {
          id: treasuryAccountId,
        },
        data: {
          balanceCents: {
            decrement: amountCents,
          },
        },
      });

      const updatedAccount = await tx.account.update({
        where: {
          id: accountId,
        },
        data: {
          balanceCents: {
            increment: amountCents,
          },
        },
      });

      return {
        statusCode: 200,
        body: {
          message: "Account funded successfully",
          transactionId: ledgerTransaction.id,
          accountId,
          amountCents,
          balanceCents: updatedAccount.balanceCents,
        },
      };
    });

    return res.status(result.statusCode).json(result.body);
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      error: "Funding failed",
    });
  }
}

// transaction can happen after account.balanceCents and _sum in ledgerBalance, so wrapped it inside $transaction

export async function getBalance(req: Request<AccountParams>, res: Response) {
  const { id } = req.params;

  const result = await prisma.$transaction(
    async (tx) => {
      const account = await tx.account.findUnique({
        where: { id },
      });

      if (!account) {
        return null;
      }

      const ledgerBalance = await tx.ledgerEntry.aggregate({
        where: {
          accountId: id,
        },
        _sum: {
          amountCents: true,
        },
      });

      const ledgerBalanceCents =
        ledgerBalance._sum.amountCents ?? 0;

      return {
        accountId: id,
        balanceCents: account.balanceCents,
        ledgerBalanceCents,
        matches: account.balanceCents === ledgerBalanceCents,
      };
    },
    {
      isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead,
    },
  );

  if (!result) {
    return res.status(404).json({
      error: "Account not found",
    });
  }

  return res.json(result);
}
