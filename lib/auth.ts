import { createAuthClient } from "better-auth/react";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const API_URL = "https://s2kwne3v8f5utw2yup3nrr4cuykmwap6.app.specular.dev";

export const BEARER_TOKEN_KEY = "capsule_bearer_token";

// eslint-disable-next-line @typescript-eslint/no-require-imports
const getExpoClient = () => require("@better-auth/expo/client").expoClient;

const getPlugins = () => {
  if (Platform.OS === "web") return [];
  const expoClient = getExpoClient();
  return [
    expoClient({
      scheme: "capsuleworkpods",
      storagePrefix: "capsuleworkpods",
      storage: SecureStore,
    }),
  ];
};

export const authClient = createAuthClient({
  baseURL: API_URL,
  plugins: getPlugins(),
  ...(Platform.OS === "web" && {
    fetchOptions: {
      credentials: "include",
      auth: {
        type: "Bearer" as const,
        token: () => localStorage.getItem(BEARER_TOKEN_KEY) || "",
      },
    },
  }),
});

export async function setBearerToken(token: string) {
  if (Platform.OS === "web") {
    localStorage.setItem(BEARER_TOKEN_KEY, token);
  } else {
    await SecureStore.setItemAsync(BEARER_TOKEN_KEY, token);
  }
}

export async function clearAuthTokens() {
  if (Platform.OS === "web") {
    localStorage.removeItem(BEARER_TOKEN_KEY);
  } else {
    await SecureStore.deleteItemAsync(BEARER_TOKEN_KEY);
  }
}

export { API_URL };
