import { Router } from "express";

import { fund, getBalance } from "../controllers/account.controller";

export const accountRouter = Router();

accountRouter.post("/accounts/:id/fund", fund);
accountRouter.get("/accounts/:id/balance", getBalance);
