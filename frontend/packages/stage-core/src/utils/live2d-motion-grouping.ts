const MOTION_SUFFIX = "motion3.json";
const MOTION_EXTENSION_REGEX = /motion3\.json$/i;
const MOTION_LEGACY_REGEX = /\.mtn$/i;
const DEFAULT_GROUP_NAME = "Default";

type MotionFileRef = { File: string };

export function collectMotionFiles(filePaths: string[]) {
  return filePaths.filter((file) => {
    return MOTION_EXTENSION_REGEX.test(file) || MOTION_LEGACY_REGEX.test(file);
  });
}

export function inferMotionGroupName(filePath: string) {
  const fileName = basename(filePath);
  const base = stripMotionExtension(fileName);
  const normalized = base.replace(/[_-]+/g, " ").trim();
  const lower = normalized.toLowerCase();

  const hasBody = lower.includes("body") || lower.includes("torso");
  const hasTap = lower.includes("tap") || lower.includes("touch") || lower.includes("poke");
  const hasFlick = lower.includes("flick") || lower.includes("swipe");
  const hasDown = lower.includes("down");
  const hasIdle = lower.includes("idle") || lower.includes("standby");

  if (hasIdle) return "Idle";
  if (hasFlick) {
    if (hasBody) return "Flick@Body";
    if (hasDown) return "FlickDown";
    return "Flick";
  }
  if (hasTap) {
    if (hasBody) return "Tap@Body";
    return "Tap";
  }

  const fallback = toTitleCase(normalized);
  return fallback || DEFAULT_GROUP_NAME;
}

export function groupMotionFiles(filePaths: string[]) {
  const groups = new Map<string, MotionFileRef[]>();
  for (const filePath of filePaths) {
    const group = inferMotionGroupName(filePath);
    const bucket = groups.get(group);
    if (bucket) {
      bucket.push({ File: filePath });
    } else {
      groups.set(group, [{ File: filePath }]);
    }
  }
  return Object.fromEntries(groups.entries());
}

export function inferMotionGroups(filePaths: string[]) {
  return Object.keys(groupMotionFiles(filePaths));
}

function stripMotionExtension(fileName: string) {
  const lower = fileName.toLowerCase();
  if (lower.endsWith(MOTION_SUFFIX)) {
    return fileName.slice(0, -MOTION_SUFFIX.length);
  }
  if (lower.endsWith(".mtn")) {
    return fileName.slice(0, -".mtn".length);
  }
  return fileName;
}

function basename(path: string) {
  return path.split(/[\\/]/).pop() ?? path;
}

function toTitleCase(value: string) {
  if (!value) return "";
  const words = value
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => {
      if (word.includes("@")) {
        return word
          .split("@")
          .filter(Boolean)
          .map((chunk) => chunk[0]?.toUpperCase() + chunk.slice(1))
          .join("@");
      }
      return word[0]?.toUpperCase() + word.slice(1);
    });
  return words.join(" ").trim();
}
