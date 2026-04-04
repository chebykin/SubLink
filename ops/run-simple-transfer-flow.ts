import { createUnlink, unlinkEvm } from "@unlink-xyz/sdk";
import { createPublicClient, createWalletClient, http, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";

import {
  deriveUnlinkAccountFromEvmKey,
  formatUsdc,
  getPrivateTokenBalance,
  getRequiredEnv,
  normalizePrivateKey,
  waitForPrivateBalanceAtLeast,
} from "./lib/unlink-helpers";

const CHAIN_ID = 84532;
const RPC_URL = "https://sepolia.base.org";
const USDC = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";
const AMOUNT = "500000";

async function main() {
  const apiKey = getRequiredEnv("UNLINK_API_KEY");
  const engineUrl = getRequiredEnv("UNLINK_API_ENDPOINT");

  const alicePrivateKey = normalizePrivateKey(getRequiredEnv("ALICE"), "ALICE");
  const bobPrivateKey = normalizePrivateKey(getRequiredEnv("BOB"), "BOB");

  const aliceEvmAccount = privateKeyToAccount(alicePrivateKey);
  const bobEvmAccount = privateKeyToAccount(bobPrivateKey);

  const aliceWalletClient = createWalletClient({
    account: aliceEvmAccount,
    chain: baseSepolia,
    transport: http(RPC_URL),
  });
  const bobWalletClient = createWalletClient({
    account: bobEvmAccount,
    chain: baseSepolia,
    transport: http(RPC_URL),
  });

  const alicePublicClient = createPublicClient({
    chain: baseSepolia,
    transport: http(RPC_URL),
  });
  const bobPublicClient = createPublicClient({
    chain: baseSepolia,
    transport: http(RPC_URL),
  });

  const [aliceChainId, bobChainId] = await Promise.all([
    alicePublicClient.getChainId(),
    bobPublicClient.getChainId(),
  ]);
  if (aliceChainId !== CHAIN_ID || bobChainId !== CHAIN_ID) {
    throw new Error(
      `Unexpected chain ID(s): Alice=${aliceChainId}, Bob=${bobChainId}. Expected ${CHAIN_ID} (Base Sepolia).`,
    );
  }

  const [aliceUnlinkAccount, bobUnlinkAccount] = await Promise.all([
    deriveUnlinkAccountFromEvmKey({
      walletClient: aliceWalletClient,
      evmAccount: aliceEvmAccount,
      index: 0,
    }),
    deriveUnlinkAccountFromEvmKey({
      walletClient: bobWalletClient,
      evmAccount: bobEvmAccount,
      index: 0,
    }),
  ]);

  const alice = createUnlink({
    engineUrl,
    apiKey,
    account: aliceUnlinkAccount,
    evm: unlinkEvm.fromViem({
      walletClient: aliceWalletClient,
      publicClient: alicePublicClient,
    }),
  });

  const bob = createUnlink({
    engineUrl,
    apiKey,
    account: bobUnlinkAccount,
    evm: unlinkEvm.fromViem({
      walletClient: bobWalletClient,
      publicClient: bobPublicClient,
    }),
  });

  console.log("Starting Unlink private transfer flow");
  console.log(`Engine URL: ${engineUrl}`);
  console.log(`Chain: Base Sepolia (${CHAIN_ID})`);
  console.log(`Token: USDC ${USDC}`);
  console.log(`Amount: ${AMOUNT} (${formatUsdc(AMOUNT)} USDC)`);

  await Promise.all([alice.ensureRegistered(), bob.ensureRegistered()]);

  const [aliceAddress, bobAddress] = await Promise.all([
    alice.getAddress(),
    bob.getAddress(),
  ]);
  console.log(`Alice Unlink address: ${aliceAddress}`);
  console.log(`Bob Unlink address:   ${bobAddress}`);

  const [aliceBalanceBefore, bobBalanceBefore] = await Promise.all([
    getPrivateTokenBalance(alice, USDC),
    getPrivateTokenBalance(bob, USDC),
  ]);

  console.log(
    `Alice initial private USDC: ${aliceBalanceBefore.toString()} (${formatUsdc(aliceBalanceBefore.toString())} USDC)`,
  );
  console.log(
    `Bob initial private USDC:   ${bobBalanceBefore.toString()} (${formatUsdc(bobBalanceBefore.toString())} USDC)`,
  );

  const approval = await alice.ensureErc20Approval({ token: USDC, amount: AMOUNT });
  if (approval.status === "submitted") {
    await alicePublicClient.waitForTransactionReceipt({
      hash: approval.txHash as Hex,
    });
  }

  const deposit = await alice.deposit({ token: USDC, amount: AMOUNT });
  const depositFinal = await alice.pollTransactionStatus(deposit.txId);
  if (depositFinal.status === "failed") {
    throw new Error(`Deposit failed (txId=${deposit.txId})`);
  }

  await waitForPrivateBalanceAtLeast({
    client: alice,
    label: "Alice",
    token: USDC,
    minAmount: aliceBalanceBefore + BigInt(AMOUNT),
  });

  const transfer = await alice.transfer({
    recipientAddress: bobAddress,
    token: USDC,
    amount: AMOUNT,
  });
  const transferFinal = await alice.pollTransactionStatus(transfer.txId);
  if (transferFinal.status === "failed") {
    throw new Error(`Transfer failed (txId=${transfer.txId})`);
  }

  await waitForPrivateBalanceAtLeast({
    client: bob,
    label: "Bob",
    token: USDC,
    minAmount: bobBalanceBefore + BigInt(AMOUNT),
  });

  const withdrawal = await bob.withdraw({
    recipientEvmAddress: bobEvmAccount.address,
    token: USDC,
    amount: AMOUNT,
  });
  const withdrawalFinal = await bob.pollTransactionStatus(withdrawal.txId);
  if (withdrawalFinal.status === "failed") {
    throw new Error(`Withdrawal failed (txId=${withdrawal.txId})`);
  }

  const [aliceFinalBalance, bobFinalBalance] = await Promise.all([
    getPrivateTokenBalance(alice, USDC),
    getPrivateTokenBalance(bob, USDC),
  ]);

  console.log(
    `Alice final private USDC: ${aliceFinalBalance.toString()} (${formatUsdc(aliceFinalBalance.toString())} USDC)`,
  );
  console.log(
    `Bob final private USDC:   ${bobFinalBalance.toString()} (${formatUsdc(bobFinalBalance.toString())} USDC)`,
  );
}

await main().catch((error) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error("\nFlow failed:");
  console.error(message);
  process.exit(1);
});
