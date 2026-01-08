import type { Live2DFactoryContext, Middleware } from "pixi-live2d-display/cubism4";

import { Live2DFactory, ModelSettings } from "pixi-live2d-display/cubism4";

const normalizeSourceMiddleware: Middleware<Live2DFactoryContext> = async (
  context,
  next
) => {
  const source = context.source as { url?: unknown; id?: unknown } | null | undefined;
  if (
    source &&
    typeof source === "object" &&
    !(source instanceof ModelSettings) &&
    "id" in source &&
    typeof source.url === "string"
  ) {
    context.source = source.url;
  }
  return next();
};

if (!Live2DFactory.live2DModelMiddlewares.includes(normalizeSourceMiddleware)) {
  Live2DFactory.live2DModelMiddlewares.unshift(normalizeSourceMiddleware);
}
