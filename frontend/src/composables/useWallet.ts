import { computed } from "vue";
import { useAppKitAccount } from "@reown/appkit/vue";
import { getWalletClient } from "@wagmi/vue/actions";
import { wagmiAdapter } from "../wallet-config";

export function useWallet() {
  const accountRef = useAppKitAccount();

  const address = computed(() => accountRef.value.address ?? null);
  const isConnected = computed(() => accountRef.value.isConnected);

  async function signMessage(message: string): Promise<`0x${string}`> {
    const client = await getWalletClient(wagmiAdapter.wagmiConfig);
    return client.signMessage({ message });
  }

  return {
    address,
    isConnected,
    signMessage,
  };
}
