import { Router } from "express";

import { addMoney, getBalance } from "../controllers/account.controller";

export const accountRouter = Router();

accountRouter.post("/accounts/:id/add-money", addMoney);
accountRouter.get("/accounts/:id/balance", getBalance);
