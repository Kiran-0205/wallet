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

app.listen(3000, () => {
  console.log("Server running on port 3000");
});