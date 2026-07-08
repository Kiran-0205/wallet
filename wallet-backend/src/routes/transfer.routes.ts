import { Router } from "express";

import { transfer } from "../controllers/transfer.controller";

export const transferRouter = Router();

transferRouter.post("/transfer", transfer);
