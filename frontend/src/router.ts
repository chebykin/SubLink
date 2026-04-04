import { createRouter, createWebHashHistory } from "vue-router";

const router = createRouter({
  history: createWebHashHistory(),
  scrollBehavior: () => ({ top: 0 }),
  routes: [
    { path: "/", redirect: "/creator" },

    // Creator mode
    {
      path: "/creator",
      component: () => import("./views/creator/CreatorDashboard.vue"),
      meta: { depth: 1 },
    },
    {
      path: "/creator/plans",
      component: () => import("./views/creator/CreatorPlans.vue"),
      meta: { depth: 1 },
    },
    {
      path: "/creator/plans/:id",
      component: () => import("./views/creator/CreatorPlanDetail.vue"),
      props: true,
      meta: { depth: 2 },
    },
    {
      path: "/creator/subscriptions",
      component: () => import("./views/creator/CreatorSubscriptions.vue"),
      meta: { depth: 1 },
    },
    {
      path: "/creator/earnings",
      component: () => import("./views/creator/CreatorEarnings.vue"),
      meta: { depth: 1 },
    },

    // Subscriber mode
    {
      path: "/subscriber",
      component: () => import("./views/subscriber/SubscriberDashboard.vue"),
      meta: { depth: 1 },
    },
    {
      path: "/subscriber/subscriptions",
      component: () => import("./views/subscriber/SubscriberSubscriptions.vue"),
      meta: { depth: 1 },
    },
    {
      path: "/subscriber/charges/:subscriptionId",
      component: () => import("./views/subscriber/SubscriberCharges.vue"),
      props: true,
      meta: { depth: 2 },
    },
  ],
});

export default router;
