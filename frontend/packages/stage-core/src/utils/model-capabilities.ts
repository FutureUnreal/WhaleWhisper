import type { VRM } from "@pixiv/three-vrm";
import type { Live2DModel } from "pixi-live2d-display/cubism4";

import type {
  Live2dModelCapabilities,
  VrmModelCapabilities,
} from "../stores/stage-model-capabilities";

import { inferExpressionName } from "./live2d-expression-utils";
import { inferMotionGroups } from "./live2d-motion-grouping";

export function extractLive2dCapabilities(
  model: Live2DModel
): Omit<Live2dModelCapabilities, "updatedAt"> {
  const internalModel = (model as any).internalModel;
  const settings = internalModel?.settings as
    | { json?: Record<string, unknown> }
    | Record<string, unknown>
    | undefined;
  const settingsJson = (settings?.json as Record<string, unknown>) ?? settings ?? {};
  const motionDefinitions =
    (internalModel?.motionManager?.definitions as Record<string, unknown>) ?? {};
  let motions = Object.keys(motionDefinitions).filter((name) => name.trim() !== "");
  if (!motions.length) {
    const fallbackGroups = Object.keys(
      (internalModel?.motionManager?.groups as Record<string, unknown>) ?? {}
    ).filter((name) => name.trim() !== "");
    if (fallbackGroups.length) {
      motions = fallbackGroups;
    }
  }
  if (!motions.length) {
    const settingsGroups = extractMotionGroupsFromSettings(settingsJson);
    if (settingsGroups.length) {
      motions = settingsGroups;
    }
  }
  if (!motions.length) {
    const motionFiles = Object.values(motionDefinitions)
      .flatMap((definition) => {
        if (!Array.isArray(definition)) return [];
        return definition
          .map((motion) => {
            if (!motion || typeof motion !== "object") return "";
            return (motion as { File?: unknown; file?: unknown }).File ??
              (motion as { File?: unknown; file?: unknown }).file ??
              "";
          })
          .filter((file) => typeof file === "string");
      })
      .filter((file) => file);
    motions = inferMotionGroups(motionFiles);
  }

  const expressionDefinitions =
    (internalModel?.expressionManager?.definitions as Array<Record<string, unknown>>) ??
    [];
  let expressions = extractExpressionNames(expressionDefinitions);
  if (!expressions.length) {
    expressions = extractExpressionNamesFromSettings(settingsJson);
  }

  return { motions, expressions };
}

export function extractVrmCapabilities(
  model: VRM
): Omit<VrmModelCapabilities, "updatedAt"> {
  const expressionMap = model.expressionManager?.expressionMap ?? {};
  const expressions = Object.keys(expressionMap).filter((name) => name.trim() !== "");
  return { expressions };
}

function extractMotionGroupsFromSettings(settingsJson: Record<string, unknown>) {
  const fileReferences =
    (settingsJson?.FileReferences as Record<string, unknown>) ??
    (settingsJson?.fileReferences as Record<string, unknown>) ??
    settingsJson;
  const motions =
    (fileReferences?.Motions as Record<string, unknown>) ??
    (fileReferences?.motions as Record<string, unknown>);
  if (!motions || typeof motions !== "object") {
    return [];
  }
  return Object.keys(motions).filter((name) => name.trim() !== "");
}

function extractExpressionNames(definitions: Array<Record<string, unknown>>) {
  return definitions
    .map((definition) => {
      if (!definition) return "";
      const name =
        (definition as { Name?: unknown }).Name ??
        (definition as { name?: unknown }).name ??
        (definition as { Id?: unknown }).Id ??
        (definition as { id?: unknown }).id;
      if (typeof name === "string") {
        return name.trim();
      }
      const file =
        (definition as { File?: unknown }).File ?? (definition as { file?: unknown }).file;
      if (typeof file === "string") {
        return inferExpressionName(file);
      }
      return "";
    })
    .map((value) => value.trim())
    .filter((value) => value);
}

function extractExpressionNamesFromSettings(settingsJson: Record<string, unknown>) {
  const fileReferences =
    (settingsJson?.FileReferences as Record<string, unknown>) ??
    (settingsJson?.fileReferences as Record<string, unknown>) ??
    settingsJson;
  const expressions =
    (fileReferences?.Expressions as Array<Record<string, unknown>>) ??
    (fileReferences?.expressions as Array<Record<string, unknown>>);
  if (!Array.isArray(expressions)) {
    return [];
  }
  return extractExpressionNames(expressions);
}
