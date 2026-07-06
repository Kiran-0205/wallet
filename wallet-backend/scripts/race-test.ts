const FROM_ID = "155a8926-ec3b-4bcc-b427-d99f2806811a";
const TO_ID = "8f3fc24e-911b-46c2-8ecc-3017431ddfb5";

async function main() {
  const requests = Array.from({ length: 10 }).map(() =>
    fetch("http://localhost:3000/transfer", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        fromId: FROM_ID,
        toId: TO_ID,
        amountCents: 2000,
      }),
    }).then(async (res) => ({
      status: res.status,
      body: await res.text(),
    }))
  );

  const results = await Promise.all(requests);
  console.log("Done\n", results);
}

main();