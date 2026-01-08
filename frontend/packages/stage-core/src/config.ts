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

export type Live2DConfig = {
  specialTokens: Live2DSpecialTokenConfig;
  expressionAutoResetMs: number;
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

let live2dConfig = mergeLive2dConfig({});

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

export function configureStage(config?: Partial<Live2DConfig>) {
  live2dConfig = mergeLive2dConfig(config);
}

export function getLive2dConfig() {
  return live2dConfig;
}
