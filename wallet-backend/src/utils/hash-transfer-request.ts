import crypto from "crypto";

export function hashTransferRequest(body: {
  fromId: string;
  toId: string;
  amountCents: number;
}) {
  return crypto
    .createHash("sha256")
    .update(JSON.stringify(body))
    .digest("hex");
}
