export type Live2DSpecialTokenAction =
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
  | {
      type: "delay";
      ms: number;
    };

export type Live2DSpecialTokenConfig = {
  enabled: boolean;
  cooldownMs: number;
  aliases: Record<string, string>;
  mappings: Record<string, Live2DSpecialTokenAction>;
};

export function normalizeSpecialToken(token: string) {
  const trimmed = token.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("<|") && trimmed.endsWith("|>")) {
    return trimmed.slice(2, -2).trim();
  }
  return trimmed;
}

export function resolveLive2dSpecialAction(
  token: string,
  config: Live2DSpecialTokenConfig
): Live2DSpecialTokenAction | null {
  if (!config.enabled) {
    return null;
  }

  const normalized = normalizeSpecialToken(token);
  if (!normalized) {
    return null;
  }

  const direct =
    config.mappings[normalized] ??
    config.mappings[normalized.toLowerCase()];
  if (direct) {
    return direct;
  }

  const alias =
    config.aliases[normalized] ??
    config.aliases[normalized.toLowerCase()];
  const aliasMapping =
    (alias && config.mappings[alias]) ||
    (alias && config.mappings[alias.toLowerCase()]);
  if (aliasMapping) {
    return aliasMapping;
  }
  if (alias) {
    const aliasAction = parseInlineAction(alias);
    if (aliasAction) {
      return aliasAction;
    }
  }

  return parseInlineAction(normalized);
}

function parseExpressionId(value: string) {
  const asNumber = Number(value);
  if (!Number.isNaN(asNumber) && Number.isFinite(asNumber)) {
    return asNumber;
  }
  return value;
}

function parseDelayMs(value: string) {
  const seconds = Number(value);
  if (!Number.isFinite(seconds) || seconds <= 0) {
    return null;
  }
  return Math.round(seconds * 1000);
}

function parseInlineAction(token: string): Live2DSpecialTokenAction | null {
  const match = token.match(/^([a-zA-Z_]+)\s*[:=]\s*(.+)$/);
  if (!match) {
    return null;
  }

  const type = match[1]?.toLowerCase();
  const value = match[2]?.trim();
  if (!value) {
    return null;
  }

  if (type === "motion") {
    return {
      type: "motion",
      group: value,
    };
  }

  if (type === "expression" || type === "exp") {
    return {
      type: "expression",
      id: parseExpressionId(value),
    };
  }

  if (type === "emote") {
    return {
      type: "expression",
      id: parseExpressionId(value),
    };
  }

  if (type === "emotion") {
    return {
      type: "expression",
      id: parseExpressionId(value),
    };
  }

  if (type === "delay") {
    const ms = parseDelayMs(value);
    if (!ms) {
      return null;
    }
    return {
      type: "delay",
      ms,
    };
  }

  return null;
}
