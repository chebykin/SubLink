import {
  createUnlink,
  unlinkEvm,
  type UnlinkAccountProvider,
} from "@unlink-xyz/sdk";
import { getPublicClient, getWalletClient } from "@wagmi/vue/actions";
import { wagmiAdapter } from "../wallet-config";
import { UNLINK_API_ENDPOINT, UNLINK_API_KEY } from "./constants";

export async function createBrowserUnlinkClient(account: UnlinkAccountProvider) {
  if (!UNLINK_API_KEY) {
    throw new Error(
      "VITE_UNLINK_API_KEY is not configured. Set it in the site's .env.",
    );
  }

  const walletClient = await getWalletClient(wagmiAdapter.wagmiConfig);
  const publicClient = getPublicClient(wagmiAdapter.wagmiConfig);

  if (!walletClient) {
    throw new Error("Wallet client unavailable. Is the wallet connected?");
  }
  if (!publicClient) {
    throw new Error("Public client unavailable.");
  }

  return createUnlink({
    engineUrl: UNLINK_API_ENDPOINT,
    apiKey: UNLINK_API_KEY,
    account,
    evm: unlinkEvm.fromViem({ walletClient, publicClient }),
  });
}
