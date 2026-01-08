import type { ProviderCatalogEntry, ProviderCatalogResponse } from "../data/provider-catalog";
import type { PluginCatalogResponse, PluginDesc } from "../data/plugin-catalog";
import { appConfig } from "../config";

const proxyBaseUrl = appConfig.providers.proxyUrl?.trim();
const apiBaseUrl = appConfig.providers.apiBaseUrl?.trim();

function resolveApiBaseUrl() {
  if (proxyBaseUrl) {
    return proxyBaseUrl.replace(/\/$/, "");
  }
  if (apiBaseUrl) {
    return apiBaseUrl.replace(/\/$/, "");
  }
  return "";
}

async function requestJson<T>(path: string): Promise<T> {
  const baseUrl = resolveApiBaseUrl();
  if (!baseUrl) {
    throw new Error("API base URL is not configured.");
  }
  const response = await fetch(`${baseUrl}${path}`);
  if (!response.ok) {
    throw new Error(`API request failed: ${response.status}`);
  }
  try {
    return (await response.json()) as T;
  } catch {
    throw new Error("API returned non-JSON response.");
  }
}

export async function listProviderCatalog(): Promise<ProviderCatalogEntry[]> {
  const data = await requestJson<ProviderCatalogResponse>("/api/providers/catalog");
  return data.providers ?? [];
}

export async function listPluginCatalog(): Promise<PluginDesc[]> {
  const data = await requestJson<PluginCatalogResponse>("/api/plugins/catalog");
  return data.plugins ?? [];
}
