import { Request, Response } from "express";

import { prisma } from "../lib/prisma";

export async function getHealth(_req: Request, res: Response) {
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
}
