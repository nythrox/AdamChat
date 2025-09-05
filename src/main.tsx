import { createRoot } from "react-dom/client";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexReactClient } from "convex/react";
import "./index.css";
import App from "./App";
import { getDefaultStore } from "jotai";
import { HeroUIProvider } from "@heroui/react";

export const convex = new ConvexReactClient(
  import.meta.env.VITE_CONVEX_URL as string
);
export const jotaiStore = getDefaultStore();

createRoot(document.getElementById("root")!).render(
  <ConvexAuthProvider client={convex}>
    <HeroUIProvider>
      <App />
    </HeroUIProvider>
  </ConvexAuthProvider>
);
