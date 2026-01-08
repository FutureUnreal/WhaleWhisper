const EXPRESSION_EXTENSION_REGEX = /exp3\.json$/i;
const LEGACY_EXPRESSION_EXTENSION_REGEX = /exp\.json$/i;

export type ExpressionFileRef = { Name: string; File: string };

export function collectExpressionFiles(filePaths: string[]) {
  return filePaths.filter((file) => {
    return (
      EXPRESSION_EXTENSION_REGEX.test(file) || LEGACY_EXPRESSION_EXTENSION_REGEX.test(file)
    );
  });
}

export function inferExpressionName(filePath: string) {
  const fileName = basename(filePath);
  const base = stripExpressionExtension(fileName);
  return base.trim();
}

export function buildExpressionDefinitions(filePaths: string[]) {
  const definitions: ExpressionFileRef[] = [];
  for (const filePath of filePaths) {
    const name = inferExpressionName(filePath);
    if (!name) continue;
    definitions.push({ Name: name, File: filePath });
  }
  return definitions;
}

function stripExpressionExtension(fileName: string) {
  const lower = fileName.toLowerCase();
  if (lower.endsWith("exp3.json")) {
    return fileName.slice(0, -"exp3.json".length);
  }
  if (lower.endsWith("exp.json")) {
    return fileName.slice(0, -"exp.json".length);
  }
  return fileName;
}

function basename(path: string) {
  return path.split(/[\\/]/).pop() ?? path;
}
