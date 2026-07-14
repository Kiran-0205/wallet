import { LedgerTransactionType, Prisma } from "@prisma/client";
import { Request, Response } from "express";

import { prisma } from "../lib/prisma";
import { hashTransferRequest } from "../utils/hash-transfer-request";

export async function transfer(req: Request, res: Response) {
  const idempotencyKey = req.header("Idempotency-Key");

  if (!idempotencyKey) {
    return res.status(400).json({
      error: "Idempotency-Key header is required",
    });
  }

  const { fromId, toId, amountCents } = req.body;

  if (!fromId || !toId || amountCents === undefined) {
    return res.status(400).json({
      error: "fromId, toId and amountCents are required",
    });
  }

  if (fromId === toId) {
    return res.status(400).json({
      error: "Cannot transfer to the same account",
    });
  }

  if (!Number.isInteger(amountCents) || amountCents <= 0) {
    return res.status(400).json({
      error: "amountCents must be a positive integer",
    });
  }

  const requestBody = {
    fromId,
    toId,
    amountCents,
  };

  const requestHash = hashTransferRequest(requestBody);

  try {
    const result = await prisma.$transaction(async (tx) => {
      const existingKey = await tx.idempotencyKey.findUnique({
        where: {
          key: idempotencyKey,
        },
      });

      if (existingKey) {
        if (existingKey.requestHash !== requestHash) {
          return {
            statusCode: 409,
            body: {
              error: "Idempotency key reused with different request body",
            },
          };
        }

        if (existingKey.status === "completed") {
          return {
            statusCode: 200,
            body: existingKey.responseBody,
          };
        }

        return {
          statusCode: 409,
          body: {
            error: "Request is already being processed",
          },
        };
      }

      await tx.idempotencyKey.create({
        data: {
          key: idempotencyKey,
          requestHash,
          status: "started",
        },
      });

      /*
       * Stage 2:
       * Lock both accounts in a consistent order.
       *
       * Consistent ordering helps prevent deadlocks when A -> B
       * and B -> A transfers happen concurrently.
       */
      const accountRows = await tx.$queryRaw<
        { id: string; balanceCents: number }[]
      >`
        SELECT id, "balanceCents"
        FROM "Account"
        WHERE id = ${fromId} OR id = ${toId}
        ORDER BY id
        FOR UPDATE
      `;

      const fromAccount = accountRows.find((account) => account.id === fromId);

      const toAccount = accountRows.find((account) => account.id === toId);

      if (!fromAccount) {
        await tx.idempotencyKey.delete({
          where: {
            key: idempotencyKey,
          },
        });

        return {
          statusCode: 404,
          body: {
            error: "Sender account not found",
          },
        };
      }

      if (!toAccount) {
        await tx.idempotencyKey.delete({
          where: {
            key: idempotencyKey,
          },
        });

        return {
          statusCode: 404,
          body: {
            error: "Receiver account not found",
          },
        };
      }

      if (fromAccount.balanceCents < amountCents) {
        await tx.idempotencyKey.delete({
          where: {
            key: idempotencyKey,
          },
        });

        return {
          statusCode: 422,
          body: {
            error: "Insufficient balance",
          },
        };
      }

      /*
       * Stage 4:
       * Create one financial transaction containing two entries.
       *
       * Sender:   -amountCents
       * Receiver: +amountCents
       *
       * Their sum is always zero.
       */
      const ledgerTransaction = await tx.ledgerTransaction.create({
        data: {
          type: LedgerTransactionType.TRANSFER,
          entries: {
            create: [
              {
                accountId: fromId,
                amountCents: -amountCents,
              },
              {
                accountId: toId,
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
       * balanceCents is now a cached balance.
       * The ledger remains the source of truth.
       */
      await tx.account.update({
        where: {
          id: fromId,
        },
        data: {
          balanceCents: {
            decrement: amountCents,
          },
        },
      });

      await tx.account.update({
        where: {
          id: toId,
        },
        data: {
          balanceCents: {
            increment: amountCents,
          },
        },
      });

      const responseBody = {
        message: "Transfer successful",
        transactionId: ledgerTransaction.id,
        fromId,
        toId,
        amountCents,
      };

      /*
       * Stage 3:
       * Store the response in the same database transaction as:
       *
       * - ledger entries
       * - sender debit
       * - receiver credit
       */
      await tx.idempotencyKey.update({
        where: {
          key: idempotencyKey,
        },
        data: {
          status: "completed",
          responseBody,
        },
      });

      return {
        statusCode: 200,
        body: responseBody,
      };
    });

    return res.status(result.statusCode).json(result.body);
  } catch (error) {
    /*
     * Two requests using the same idempotency key can arrive
     * concurrently. Both may initially find no existing key.
     *
     * The unique constraint allows only one insert.
     */
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      const existingKey = await prisma.idempotencyKey.findUnique({
        where: {
          key: idempotencyKey,
        },
      });

      if (existingKey?.requestHash !== requestHash) {
        return res.status(409).json({
          error: "Idempotency key reused with different request body",
        });
      }

      if (existingKey?.status === "completed") {
        return res.status(200).json(existingKey.responseBody);
      }

      return res.status(409).json({
        error: "Request is already being processed",
      });
    }

    console.error(error);

    return res.status(500).json({
      error: "Transfer failed",
    });
  }
}
