<script setup lang="ts">
import { heroTitle, heroSubtitle } from "./content";
</script>

<template>
  <main class="shell">
    <section class="hero">
      <p class="eyebrow">Base Sepolia Hackathon Build</p>
      <h1>{{ heroTitle }}</h1>
      <p class="lede">
        {{ heroSubtitle }}
      </p>
    </section>
  </main>
</template>
