import express from "express";

import { accountRouter } from "./routes/account.routes";
import { healthRouter } from "./routes/health.routes";
import { transferRouter } from "./routes/transfer.routes";
import { userRouter } from "./routes/user.routes";

export function createApp() {
  const app = express();

  app.use(healthRouter);
  app.use(express.json());

  app.use(userRouter);
  app.use(accountRouter);
  app.use(transferRouter);

  return app;
}
