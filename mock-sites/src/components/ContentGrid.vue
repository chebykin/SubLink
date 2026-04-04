<script setup lang="ts">
import ContentCard from "./ContentCard.vue";

defineProps<{
  unlocked: boolean;
}>();

const articles = [
  {
    title: "Understanding Privacy Pools in DeFi",
    description: "An in-depth guide to how privacy pools work, their role in shielding transaction data, and why they matter for the future of decentralized finance.",
    category: "Guide",
  },
  {
    title: "Getting Started with Base Sepolia",
    description: "Step-by-step walkthrough for deploying and testing your first smart contract on the Base Sepolia testnet using modern tools.",
    category: "Tutorial",
  },
  {
    title: "Token Streaming: The Next Revenue Model",
    description: "Explore how real-time token streaming is replacing traditional payment cycles, enabling instant payroll and subscription models on-chain.",
    category: "Analysis",
  },
  {
    title: "Zero-Knowledge Proofs Simplified",
    description: "A beginner-friendly explanation of ZK proofs, their practical applications in blockchain verification, and current limitations.",
    category: "Deep Dive",
  },
  {
    title: "Building Subscription Protocols On-Chain",
    description: "Learn the architecture behind decentralized subscription systems, including recurring payments, cancellation flows, and access verification.",
    category: "Engineering",
  },
  {
    title: "USDC on Layer 2: Speed vs Security",
    description: "Comparing USDC bridging mechanics across L2 networks, with focus on finality guarantees, withdrawal times, and trust assumptions.",
    category: "Research",
  },
];
</script>

<template>
  <section class="content-section">
    <div class="section-header">
      <h2 class="section-title">Exclusive Content</h2>
      <p class="section-desc">{{ unlocked ? "You have full access to all articles." : "Subscribe to unlock all content below." }}</p>
    </div>
    <div class="content-grid">
      <ContentCard
        v-for="(article, i) in articles"
        :key="i"
        :title="article.title"
        :description="article.description"
        :category="article.category"
        :locked="!unlocked && i >= 2"
        :index="i"
      />
    </div>
  </section>
</template>

<style scoped>
.content-section {
  padding: 0 24px 48px;
  max-width: 1120px;
  margin: 0 auto;
  width: 100%;
}

.section-header {
  margin-bottom: 24px;
  animation: fade-in-up 0.4s var(--ease-decel) 0.2s both;
}

.section-title {
  font-size: 1.375rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--text-primary);
}

.section-desc {
  margin-top: 4px;
  font-size: 0.9375rem;
  color: var(--text-secondary);
}

.content-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
}

@media (max-width: 640px) {
  .content-section {
    padding: 0 16px 32px;
  }

  .content-grid {
    grid-template-columns: 1fr;
    gap: 16px;
  }
}
</style>
