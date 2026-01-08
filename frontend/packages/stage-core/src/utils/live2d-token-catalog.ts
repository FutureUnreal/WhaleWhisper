type EmoteMapping = Record<string, string>;
type EmoteSource = "motion" | "expression";

function normalizeList(list: string[]) {
  const result: string[] = [];
  const seen = new Set<string>();
  for (const item of list) {
    const trimmed = String(item ?? "").trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(trimmed);
  }
  return result;
}


export function normalizeEmoteKey(key: string) {
  return String(key ?? "")
    .trim()
    .replace(/[\s-]+/g, "_")
    .replace(/[^a-zA-Z0-9_]/g, "_");
}

export function formatEmoteToken(key: string) {
  const normalized = normalizeEmoteKey(key);
  if (!normalized) return "";
  return `<|EMOTE_${normalized.toUpperCase()}|>`;
}

export function buildEmoteTokens(emotes: EmoteMapping) {
  const tokens: string[] = [];
  const seen = new Set<string>();
  for (const [, action] of Object.entries(emotes ?? {})) {
    const match = String(action ?? "").match(/^(expression|exp|emotion)\s*:\s*(.+)$/i);
    if (!match) continue;
    const value = match[2]?.trim();
    if (!value) continue;
    const normalized = value.toLowerCase();
    if (seen.has(normalized)) continue;
    seen.add(normalized);
    tokens.push(`<|EMOTE:${value}|>`);
  }
  return tokens;
}

export function buildEmoteAliases(emotes: EmoteMapping) {
  const aliases: Record<string, string> = {};
  for (const [key, action] of Object.entries(emotes ?? {})) {
    const normalized = normalizeEmoteKey(key).toLowerCase();
    if (!normalized) continue;
    if (!action) continue;
    aliases[`emote_${normalized}`] = action;
    aliases[`emotion:${normalized}`] = action;
  }
  return aliases;
}

export function buildAutoEmoteMappings(
  motions: string[],
  expressions: string[]
) {
  const mappings: EmoteMapping = {};
  const used = new Set<string>();
  const reserved = new Set<string>();

  const orderedExpressions = normalizeList(expressions);

  for (const name of orderedExpressions) {
    addEmoteMapping(mappings, used, reserved, name, "expression");
  }

  return mappings;
}

export function buildMotionTokens(motions: string[]) {
  return normalizeList(motions).map((motion) => `<|MOTION:${motion}|>`);
}

export function buildExpressionTokens(expressions: string[]) {
  return normalizeList(expressions).map(
    (expression) => `<|EXPRESSION:${expression}|>`
  );
}

function addEmoteMapping(
  mappings: EmoteMapping,
  used: Set<string>,
  reserved: Set<string>,
  name: string,
  source: EmoteSource
) {
  const baseKey = normalizeEmoteKey(name);
  if (!baseKey) return;
  const action = `${source}:${name}`;
  if (!used.has(baseKey)) {
    mappings[baseKey] = action;
    used.add(baseKey);
    reserved.add(baseKey);
    return;
  }

  if (mappings[baseKey] === action) {
    return;
  }

  const suffix = source === "motion" ? "motion" : "expression";
  let candidate = `${baseKey}_${suffix}`;
  let counter = 1;
  while (reserved.has(candidate)) {
    counter += 1;
    candidate = `${baseKey}_${suffix}_${counter}`;
  }
  mappings[candidate] = action;
  reserved.add(candidate);
}
