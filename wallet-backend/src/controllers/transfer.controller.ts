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

  if (!fromId || !toId || !amountCents) {
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

      const fromRows = await tx.$queryRaw<
        { id: string; balanceCents: number }[]
      >`
        SELECT id, "balanceCents"
        FROM "Account"
        WHERE id = ${fromId}
        FOR UPDATE
      `;

      const fromAccount = fromRows[0];

      if (!fromAccount) {
        throw new Error("Sender account not found");
      }

      const toAccount = await tx.account.findUnique({
        where: {
          id: toId,
        },
      });

      if (!toAccount) {
        throw new Error("Receiver account not found");
      }

      if (fromAccount.balanceCents < amountCents) {
        return {
          statusCode: 422,
          body: {
            error: "Insufficient balance",
          },
        };
      }

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
        fromId,
        toId,
        amountCents,
      };

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
    console.error(error);

    return res.status(500).json({
      error: "Transfer failed",
    });
  }
}
