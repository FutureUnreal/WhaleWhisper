import {
  buildAutoEmoteMappings,
  buildEmoteTokens,
  buildExpressionTokens,
  buildMotionTokens,
} from "./live2d-token-catalog";

export type ActionTokenPromptContext = {
  format?: "live2d" | "vrm";
  motions?: string[];
  expressions?: string[];
  emotes?: Record<string, string>;
};

function buildPromptLines(
  locale: string,
  emotionTokens: string[],
  actionTokens: string[],
  expressionTokens: string[]
) {
  const normalized = locale.toLowerCase();
  const isZh = normalized.startsWith("zh");
  const lines: string[] = [];

  lines.push(
    isZh
      ? "【表情与动作标记使用说明】\n在回复中自然使用以下标记来表达情绪、增强互动感。根据对话情境选择合适的标记，不要过度使用（不要解释标记本身）。"
      : "【Expression & Action Token Usage】\nNaturally use the following tokens in your responses to express emotions and enhance interaction. Choose appropriate tokens based on conversation context; avoid overuse (do not explain the tokens themselves)."
  );
  const hasEmotions = emotionTokens.length > 0;
  const hasExpressions = expressionTokens.length > 0;
  if (hasEmotions) {
    lines.push(
      isZh ? `\n可用情绪标记：${emotionTokens.join(" ")}` : `\nAvailable emotion tokens: ${emotionTokens.join(" ")}`
    );
  } else if (hasExpressions) {
    lines.push(
      isZh ? `\n可用表情标记：${expressionTokens.join(" ")}` : `\nAvailable expression tokens: ${expressionTokens.join(" ")}`
    );
  }
  if (actionTokens.length) {
    lines.push(
      isZh ? `可用动作标记：${actionTokens.join(" ")}` : `Available action tokens: ${actionTokens.join(" ")}`
    );
  }
  lines.push(
    isZh
      ? `延迟控制：<|DELAY:n|>（n 为秒数，例如 <|DELAY:1.5|> 表示暂停1.5秒）\n\n使用原则：标记可独立成行或嵌入句中，根据情绪自然选择，避免连续重复。`
      : `Delay control: <|DELAY:n|> (n is seconds, e.g., <|DELAY:1.5|> means pause for 1.5 seconds)\n\nUsage principles: Tokens can be standalone or embedded in text. Choose naturally based on emotion; avoid consecutive repetition.`
  );

  return lines.join("\n");
}

export function buildActionTokenPrompt(
  locale: string,
  context?: ActionTokenPromptContext
) {
  const motions = context?.motions ?? [];
  const expressions = context?.expressions ?? [];
  const isLive2d = context?.format === "live2d";
  const autoEmotes = isLive2d
    ? buildAutoEmoteMappings(motions, expressions)
    : {};
  const manualEmotes = context?.emotes ?? {};
  const emoteMappings = isLive2d
    ? { ...autoEmotes, ...manualEmotes }
    : {};
  const emoteTokens = isLive2d ? buildEmoteTokens(emoteMappings) : [];
  const actionTokens = motions.length ? buildMotionTokens(motions) : [];
  const expressionTokens = expressions.length ? buildExpressionTokens(expressions) : [];

  return buildPromptLines(locale, emoteTokens, actionTokens, expressionTokens);
}
