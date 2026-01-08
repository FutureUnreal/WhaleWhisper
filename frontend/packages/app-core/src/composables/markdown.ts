import type { RehypeShikiOptions } from "@shikijs/rehype";
import type { BundledLanguage } from "shiki";
import type { Processor } from "unified";

import rehypeShiki from "@shikijs/rehype";
import rehypeKatex from "rehype-katex";
import rehypeStringify from "rehype-stringify";
import remarkMath from "remark-math";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";

type MarkdownProcessor = Processor<any, any, any, any, string>;

const processorCache = new Map<string, Promise<MarkdownProcessor>>();
const langRegex = /```(.{2,})\s/g;

function extractLangs(markdown: string): BundledLanguage[] {
  const matches = markdown.matchAll(langRegex);
  const langs = new Set<BundledLanguage>();
  langs.add("python");
  for (const match of matches) {
    if (match[1]) {
      langs.add(match[1] as BundledLanguage);
    }
  }
  return [...langs];
}

async function createProcessor(langs: BundledLanguage[]): Promise<MarkdownProcessor> {
  const options: RehypeShikiOptions = {
    themes: {
      light: "github-light",
      dark: "github-dark",
    },
    langs,
    defaultLanguage: langs[0] || "python",
  };

  return unified()
    .use(remarkParse)
    .use(remarkMath)
    .use(remarkRehype)
    .use(rehypeKatex, { output: "mathml" })
    .use(rehypeShiki, options)
    .use(rehypeStringify);
}

function getProcessor(langs: BundledLanguage[]): Promise<MarkdownProcessor> {
  const cacheKey = [...langs].sort().join(",");

  if (!processorCache.has(cacheKey)) {
    const processorPromise = createProcessor(langs);
    processorCache.set(cacheKey, processorPromise);
  }

  return processorCache.get(cacheKey)!;
}

export function useMarkdown() {
  const fallbackProcessor = unified()
    .use(remarkParse)
    .use(remarkMath)
    .use(remarkRehype)
    .use(rehypeKatex, { output: "mathml" })
    .use(rehypeStringify);

  return {
    process: async (markdown: string): Promise<string> => {
      try {
        if (!/`{3,}/.test(markdown)) {
          return fallbackProcessor.processSync(markdown).toString();
        }

        const langs = extractLangs(markdown);
        const langSet = new Set(langs);
        langSet.add("python");
        const languagesToLoad = Array.from(langSet);

        const processor = await getProcessor(languagesToLoad);
        const result = await processor.process(markdown);
        return result.toString();
      } catch (error) {
        console.warn(
          "Failed to process markdown with syntax highlighting, falling back to basic processing:",
          error
        );
        return fallbackProcessor.processSync(markdown).toString();
      }
    },
    processSync: (markdown: string): string => {
      return fallbackProcessor.processSync(markdown).toString();
    },
  };
}
