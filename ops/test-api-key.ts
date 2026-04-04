import { createUnlinkClient, getEnvironment, UnlinkApiError } from "@unlink-xyz/sdk";

function getRequiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function maskSecret(value: string): string {
  if (value.length <= 8) return "********";
  return `${value.slice(0, 4)}...${value.slice(-4)}`;
}

async function main() {
  const apiKey = getRequiredEnv("UNLINK_API_KEY");
  const endpoint = getRequiredEnv("UNLINK_API_ENDPOINT");
  const baseUrl = endpoint.replace(/\/+$/, "");

  console.log("Testing Unlink API key");
  console.log(`Endpoint: ${endpoint}`);
  console.log(`API key: ${maskSecret(apiKey)}`);

  // Public endpoint: useful for environment details.
  const client = createUnlinkClient(endpoint, apiKey);
  const environment = await getEnvironment(client);

  // Auth-protected probe: this endpoint requires Authorization.
  // We intentionally send an invalid body to avoid creating users.
  const probeResponse = await fetch(`${baseUrl}/users`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: "{}",
  });

  const probeBody = (await probeResponse.json().catch(() => ({}))) as {
    error?: { code?: string; message?: string };
  };
  const probeCode = probeBody.error?.code;
  const probeMessage = probeBody.error?.message;

  if (probeResponse.status === 401) {
    throw new Error(
      `API key rejected by auth-protected endpoint: ${probeCode ?? "UNKNOWN"}${probeMessage ? ` (${probeMessage})` : ""}`,
    );
  }

  console.log("API key is valid (auth-protected endpoint accepted the key).");
  console.log(
    `Auth probe status: ${probeResponse.status}${probeCode ? ` (${probeCode})` : ""}`,
  );
  console.log(`Environment: ${environment.name}`);
  console.log(`Chain ID: ${environment.chain_id}`);
  console.log(`Pool address: ${environment.pool_address}`);
  console.log(`Permit2 address: ${environment.permit2_address}`);
}

await main().catch((error) => {
  console.error("\nAPI key test failed.");

  if (error instanceof UnlinkApiError) {
    console.error(
      `UnlinkApiError [${error.operation}] ${error.code}: ${error.detail || error.message}`,
    );
    process.exit(1);
  }

  if (error instanceof Error) {
    console.error(error.message);
    process.exit(1);
  }

  console.error(String(error));
  process.exit(1);
});
