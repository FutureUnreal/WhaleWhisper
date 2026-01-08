import type { ModelSettings } from "pixi-live2d-display/cubism4";

import JSZip from "jszip";
import { Cubism4ModelSettings, ZipLoader } from "pixi-live2d-display/cubism4";

import {
  buildExpressionDefinitions,
  collectExpressionFiles,
} from "./live2d-expression-utils";
import { collectMotionFiles, groupMotionFiles } from "./live2d-motion-grouping";

ZipLoader.zipReader = (data: Blob) => JSZip.loadAsync(data);

const defaultCreateSettings = ZipLoader.createSettings;
ZipLoader.createSettings = async (reader: JSZip) => {
  const filePaths = Object.keys(reader.files);

  if (!filePaths.find((file) => isSettingsFile(file))) {
    return createFakeSettings(filePaths);
  }

  const settings = await defaultCreateSettings(reader);
  const motionFiles = collectMotionFiles(filePaths);
  if (motionFiles.length) {
    const fileReferences = ensureFileReferences(settings);
    const motions =
      (fileReferences as { Motions?: Record<string, unknown> }).Motions ??
      (fileReferences as { motions?: Record<string, unknown> }).motions;
    if (!hasNamedMotionGroups(motions)) {
      fileReferences.Motions = groupMotionFiles(motionFiles);
    }
  }
  const expressionFiles = collectExpressionFiles(filePaths);
  if (expressionFiles.length) {
    const fileReferences = ensureFileReferences(settings);
    const expressions =
      (fileReferences as { Expressions?: unknown }).Expressions ??
      (fileReferences as { expressions?: unknown }).expressions;
    if (!hasNamedExpressions(expressions)) {
      fileReferences.Expressions = buildExpressionDefinitions(expressionFiles);
    }
  }
  return settings;
};

export function isSettingsFile(file: string) {
  return file.endsWith("model3.json");
}

export function isMocFile(file: string) {
  return file.endsWith(".moc3");
}

export function basename(path: string): string {
  return path.split(/[\\/]/).pop()!;
}

function createFakeSettings(files: string[]): ModelSettings {
  const mocFiles = files.filter((file) => isMocFile(file));

  if (mocFiles.length !== 1) {
    const fileList = mocFiles.length ? `(${mocFiles.map((f) => `"${f}"`).join(",")})` : "";
    throw new Error(`Expected exactly one moc file, got ${mocFiles.length} ${fileList}`);
  }

  const mocFile = mocFiles[0];
  const modelName = basename(mocFile).replace(/\.moc3?/, "");
  const textures = files.filter((file) => file.endsWith(".png"));

  if (!textures.length) {
    throw new Error("Textures not found");
  }

  const motions = collectMotionFiles(files);
  const expressions = collectExpressionFiles(files);
  const physics = files.find((file) => file.includes("physics"));
  const pose = files.find((file) => file.includes("pose"));

  const settings = new Cubism4ModelSettings({
    url: `${modelName}.model3.json`,
    Version: 3,
    FileReferences: {
      Moc: mocFile,
      Textures: textures,
      Physics: physics,
      Pose: pose,
      Motions: motions.length ? groupMotionFiles(motions) : undefined,
      Expressions: expressions.length ? buildExpressionDefinitions(expressions) : undefined,
    },
  });

  settings.name = modelName;
  (settings as any)._objectURL = `example://${settings.url}`;

  return settings;
}

function ensureFileReferences(settings: ModelSettings) {
  const candidate =
    (settings as { FileReferences?: Record<string, unknown> }).FileReferences ??
    (settings as { fileReferences?: Record<string, unknown> }).fileReferences;
  if (candidate) {
    return candidate as Record<string, unknown>;
  }
  const fileReferences: Record<string, unknown> = {};
  (settings as { FileReferences?: Record<string, unknown> }).FileReferences =
    fileReferences;
  return fileReferences;
}

function hasNamedMotionGroups(motions: unknown) {
  if (!motions || typeof motions !== "object") {
    return false;
  }
  const entries = Object.entries(motions as Record<string, unknown>);
  if (!entries.length) {
    return false;
  }
  const hasNamed = entries.some(([key]) => key.trim().length > 0);
  if (!hasNamed) {
    return false;
  }
  return entries.some(([, value]) => {
    if (Array.isArray(value)) {
      return value.length > 0;
    }
    return Boolean(value);
  });
}

function hasNamedExpressions(expressions: unknown) {
  if (!Array.isArray(expressions)) {
    return false;
  }
  return expressions.some((entry) => {
    if (!entry || typeof entry !== "object") {
      return false;
    }
    const name =
      (entry as { Name?: unknown }).Name ??
      (entry as { name?: unknown }).name ??
      (entry as { Id?: unknown }).Id ??
      (entry as { id?: unknown }).id;
    if (typeof name === "string" && name.trim() !== "") {
      return true;
    }
    const file =
      (entry as { File?: unknown }).File ?? (entry as { file?: unknown }).file;
    return typeof file === "string" && file.trim() !== "";
  });
}

ZipLoader.readText = (jsZip: JSZip, path: string) => {
  const file = jsZip.file(path);

  if (!file) {
    throw new Error(`Cannot find file: ${path}`);
  }

  return file.async("text");
};

ZipLoader.getFilePaths = (jsZip: JSZip) => {
  const paths: string[] = [];

  jsZip.forEach((relativePath) => paths.push(relativePath));

  return Promise.resolve(paths);
};

ZipLoader.getFiles = (jsZip: JSZip, paths: string[]) =>
  Promise.all(
    paths.map(async (path) => {
      const fileName = path.slice(path.lastIndexOf("/") + 1);
      const blob = await jsZip.file(path)!.async("blob");

      return new File([blob], fileName);
    })
  );
