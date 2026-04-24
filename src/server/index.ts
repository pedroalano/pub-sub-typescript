import amqp from "amqplib";

async function main() {
  console.log("Starting Peril server...");

  const rabbitConnString = "amqp://guest:guest@localhost:5672/";
  const conn = await amqp.connect(rabbitConnString);
  console.log("Connected to RabbitMQ");

  await new Promise<void>((resolve) => {
    process.on("SIGINT", () => resolve());
  });

  console.log("Shutting down Peril server...");
  await conn.close();
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
