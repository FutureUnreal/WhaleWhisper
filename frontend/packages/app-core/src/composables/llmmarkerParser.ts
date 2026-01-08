const TAG_OPEN = "<|";
const TAG_CLOSE = "|>";

export function useLlmmarkerParser(options: {
  onLiteral?: (literal: string) => void | Promise<void>;
  onSpecial?: (special: string) => void | Promise<void>;
  minLiteralEmitLength?: number;
}) {
  const minLiteralEmitLength = Math.max(1, options.minLiteralEmitLength ?? 1);
  let buffer = "";
  let inTag = false;

  return {
    async consume(textPart: string) {
      buffer += textPart;

      while (buffer.length > 0) {
        if (!inTag) {
          const openTagIndex = buffer.indexOf(TAG_OPEN);
          if (openTagIndex < 0) {
            if (buffer.length - 1 >= minLiteralEmitLength) {
              const emit = buffer.slice(0, -1);
              buffer = buffer[buffer.length - 1];
              await options.onLiteral?.(emit);
            }
            break;
          }

          if (openTagIndex > 0) {
            const emit = buffer.slice(0, openTagIndex);
            buffer = buffer.slice(openTagIndex);
            await options.onLiteral?.(emit);
          }
          inTag = true;
        } else {
          const closeTagIndex = buffer.indexOf(TAG_CLOSE);
          if (closeTagIndex < 0) {
            break;
          }

          const emit = buffer.slice(0, closeTagIndex + TAG_CLOSE.length);
          buffer = buffer.slice(closeTagIndex + TAG_CLOSE.length);
          await options.onSpecial?.(emit);
          inTag = false;
        }
      }
    },

    async end() {
      if (!inTag && buffer.length > 0) {
        await options.onLiteral?.(buffer);
        buffer = "";
      }
    },
  };
}
