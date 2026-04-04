import {
  createUnlink,
  unlinkAccount,
  type AccountKeys,
  type UnlinkClient,
} from "@unlink-xyz/sdk";

import {
  POLL_INTERVAL_MS,
  POLL_TIMEOUT_MS,
  UNLINK_API_ENDPOINT,
  UNLINK_API_KEY,
  USDC_ADDRESS,
} from "../config";
import { deserializeAccountKeys } from "./account-keys";

export interface ChargeExecutionResult {
  status: "success" | "failed";
  txId: string | null;
  errorMessage: string | null;
}

const accountTransferLocks = new Map<string, Promise<void>>();

export async function withAccountTransferLock<T>(
  accountAddress: string,
  task: () => Promise<T>,
): Promise<T> {
  const previous = accountTransferLocks.get(accountAddress);
  let releaseLock!: () => void;
  const lock = new Promise<void>((resolve) => {
    releaseLock = resolve;
  });

  accountTransferLocks.set(accountAddress, lock);

  if (previous) {
    await previous.catch(() => undefined);
  }

  try {
    return await task();
  } finally {
    releaseLock();
    if (accountTransferLocks.get(accountAddress) === lock) {
      accountTransferLocks.delete(accountAddress);
    }
  }
}

export function resetAccountTransferLocksForTests(): void {
  accountTransferLocks.clear();
}

function getRequiredUnlinkConfig(): { engineUrl: string; apiKey: string } {
  if (!UNLINK_API_ENDPOINT || !UNLINK_API_KEY) {
    throw new Error(
      "UNLINK_API_ENDPOINT and UNLINK_API_KEY are required for Unlink operations.",
    );
  }

  return {
    engineUrl: UNLINK_API_ENDPOINT,
    apiKey: UNLINK_API_KEY,
  };
}

export function findTokenBalance(
  balances: Array<{ token: string; amount: string }>,
  token: string,
): string {
  const match = balances.find(
    (entry) => entry.token.toLowerCase() === token.toLowerCase(),
  );
  return match?.amount ?? "0";
}

export function createUnlinkClientFromAccountKeys(
  accountKeys: AccountKeys,
): UnlinkClient {
  const config = getRequiredUnlinkConfig();
  return createUnlink({
    engineUrl: config.engineUrl,
    apiKey: config.apiKey,
    account: unlinkAccount.fromKeys(accountKeys),
  });
}

export function createUnlinkClientFromSerializedKeys(
  accountKeysJson: string,
): UnlinkClient {
  const accountKeys = deserializeAccountKeys(accountKeysJson);
  return createUnlinkClientFromAccountKeys(accountKeys);
}

export async function getPrivateTokenBalance(params: {
  unlink: UnlinkClient;
  token?: string;
}): Promise<bigint> {
  const token = params.token ?? USDC_ADDRESS;
  const { balances } = await params.unlink.getBalances({ token });
  return BigInt(findTokenBalance(balances, token));
}

export async function executeTransferFromSerializedKeys(params: {
  accountKeysJson: string;
  recipientAddress: string;
  amount: string;
  token?: string;
}): Promise<ChargeExecutionResult> {
  const token = params.token ?? USDC_ADDRESS;

  try {
    const accountKeys = deserializeAccountKeys(params.accountKeysJson);
    const unlink = createUnlinkClientFromAccountKeys(accountKeys);

    return withAccountTransferLock(accountKeys.address, async () => {
      // Balance pre-check is advisory. Transfer still remains the source of truth.
      const balance = await getPrivateTokenBalance({ unlink, token });
      if (balance < BigInt(params.amount)) {
        return {
          status: "failed",
          txId: null,
          errorMessage: `Insufficient private balance: have ${balance.toString()}, need ${params.amount}`,
        };
      }

      const transfer = await unlink.transfer({
        recipientAddress: params.recipientAddress,
        token,
        amount: params.amount,
      });

      const txId = transfer.txId;

      let finalStatus: string;
      try {
        const confirmed = await unlink.pollTransactionStatus(txId, {
          intervalMs: POLL_INTERVAL_MS,
          timeoutMs: POLL_TIMEOUT_MS,
        });
        finalStatus = confirmed.status;
      } catch (error) {
        return {
          status: "failed",
          txId,
          errorMessage:
            error instanceof Error
              ? error.message
              : "Failed while polling transaction status.",
        };
      }

      if (finalStatus === "failed") {
        return {
          status: "failed",
          txId,
          errorMessage: "Unlink transfer failed.",
        };
      }

      return {
        status: "success",
        txId,
        errorMessage: null,
      };
    });
  } catch (error) {
    return {
      status: "failed",
      txId: null,
      errorMessage: error instanceof Error ? error.message : String(error),
    };
  }
}
