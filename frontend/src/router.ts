import { createRouter, createWebHashHistory } from "vue-router";

const router = createRouter({
  history: createWebHashHistory(),
  routes: [
    { path: "/", redirect: "/creator" },

    // Creator mode
    {
      path: "/creator",
      component: () => import("./views/creator/CreatorDashboard.vue"),
    },
    {
      path: "/creator/plans",
      component: () => import("./views/creator/CreatorPlans.vue"),
    },
    {
      path: "/creator/plans/:id",
      component: () => import("./views/creator/CreatorPlanDetail.vue"),
      props: true,
    },
    {
      path: "/creator/subscriptions",
      component: () => import("./views/creator/CreatorSubscriptions.vue"),
    },
    {
      path: "/creator/earnings",
      component: () => import("./views/creator/CreatorEarnings.vue"),
    },

    // Subscriber mode
    {
      path: "/subscriber",
      component: () => import("./views/subscriber/SubscriberDashboard.vue"),
    },
    {
      path: "/subscriber/subscriptions",
      component: () => import("./views/subscriber/SubscriberSubscriptions.vue"),
    },
    {
      path: "/subscriber/charges/:subscriptionId",
      component: () => import("./views/subscriber/SubscriberCharges.vue"),
      props: true,
    },
  ],
});

export default router;
