import type { DisplayModel } from "../stores/display-models";

export function resolveModelMappingKey(model?: DisplayModel) {
  if (!model) return undefined;
  if (model.source === "preset") return model.id;
  if (model.kind === "file") return model.name || model.id;
  if (model.kind === "url") return model.url || model.name || model.id;
  return model.id;
}
