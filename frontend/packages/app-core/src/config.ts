import baseConfig from "./config.json";

type Live2DSpecialTokenConfig = {
  enabled: boolean;
  cooldownMs: number;
  aliases: Record<string, string>;
  mappings: Record<
    string,
    | {
        type: "motion";
        group: string;
        index?: number;
        priority?: number;
      }
    | {
        type: "expression";
        id?: string | number;
      }
  >;
};

type Live2DConfig = {
  specialTokens: Live2DSpecialTokenConfig;
  expressionAutoResetMs: number;
};

type ProvidersConfig = {
  proxyUrl?: string;
  apiBaseUrl?: string;
};

type PersonaConfig = {
  name?: string;
  description?: string;
  prompt?: string;
};

type RuntimeConfig = {
  wsUrl?: string;
  providers?: {
    proxyUrl?: string;
    apiBaseUrl?: string;
  };
};

const live2dDefaults: Live2DConfig = {
  specialTokens: {
    enabled: true,
    cooldownMs: 400,
    aliases: {},
    mappings: {},
  },
  expressionAutoResetMs: 3000,
};

function mergeLive2dConfig(config?: Partial<Live2DConfig>): Live2DConfig {
  const specialTokens = config?.specialTokens ?? {};
  const tokenAliases =
    (specialTokens as Partial<Live2DSpecialTokenConfig>).aliases ?? {};
  const tokenMappings =
    (specialTokens as Partial<Live2DSpecialTokenConfig>).mappings ?? {};
  const expressionAutoResetMs =
    Number.isFinite(config?.expressionAutoResetMs) &&
    (config?.expressionAutoResetMs as number) >= 0
      ? Number(config?.expressionAutoResetMs)
      : live2dDefaults.expressionAutoResetMs;
  return {
    specialTokens: {
      ...live2dDefaults.specialTokens,
      ...specialTokens,
      aliases: {
        ...live2dDefaults.specialTokens.aliases,
        ...tokenAliases,
      },
      mappings: {
        ...live2dDefaults.specialTokens.mappings,
        ...tokenMappings,
      },
    },
    expressionAutoResetMs,
  };
}

const runtimeConfig: RuntimeConfig | undefined =
  typeof window === "undefined"
    ? undefined
    : (window as Window & {
        __WHALEWHISPER_RUNTIME_CONFIG__?: RuntimeConfig;
      }).__WHALEWHISPER_RUNTIME_CONFIG__;

export const appConfig = {
  wsUrl:
    runtimeConfig?.wsUrl ||
    import.meta.env.VITE_WS_URL ||
    baseConfig.wsUrl ||
    "ws://localhost:8090/ws",
  wsToken: import.meta.env.VITE_WS_TOKEN || baseConfig.wsToken || "",
  wsModuleName:
    import.meta.env.VITE_WS_MODULE_NAME || baseConfig.wsModuleName || "whalewhisper:stage-web",
  userId: import.meta.env.VITE_USER_ID || baseConfig.userId || "whale",
  profileId:
    import.meta.env.VITE_PROFILE_ID || baseConfig.profileId || "whale-learning-assistant",
  persona: {
    name: import.meta.env.VITE_PERSONA_NAME || baseConfig.personaName || "WhaleWhisper",
    description:
      import.meta.env.VITE_PERSONA_DESCRIPTION ||
      baseConfig.personaDescription ||
      "",
    prompt: import.meta.env.VITE_PERSONA_PROMPT || baseConfig.personaPrompt || "",
  } satisfies PersonaConfig,
  providers: {
    proxyUrl:
      runtimeConfig?.providers?.proxyUrl ||
      import.meta.env.VITE_PROVIDERS_PROXY_URL ||
      baseConfig.providersProxyUrl ||
      "",
    apiBaseUrl:
      runtimeConfig?.providers?.apiBaseUrl ||
      import.meta.env.VITE_API_BASE_URL ||
      baseConfig.providersApiBaseUrl ||
      "",
  } satisfies ProvidersConfig,
  live2d: mergeLive2dConfig(baseConfig.live2d),
};
