import { Request, Response } from "express";

import { prisma } from "../lib/prisma";

export async function createUser(req: Request, res: Response) {
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
}
