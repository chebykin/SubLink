import { createApp } from "vue";
import { QueryClient, VueQueryPlugin } from "@tanstack/vue-query";
import App from "./App.vue";
import router from "./router";
import "./wallet-config";
import "./style.css";

const queryClient = new QueryClient();

const app = createApp(App);
app.use(router);
app.use(VueQueryPlugin, { queryClient });
app.mount("#app");
