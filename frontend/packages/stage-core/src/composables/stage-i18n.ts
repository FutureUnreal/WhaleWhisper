import { inject, provide } from "vue";

export type StageI18n = {
  t: (key: string) => string;
};

const StageI18nSymbol = Symbol("stage-i18n");

const fallbackI18n: StageI18n = {
  t: (key) => {
    if (key === "stage.vrm.empty") {
      return "No VRM model loaded";
    }
    return key;
  },
};

export function provideStageI18n(i18n: StageI18n) {
  provide(StageI18nSymbol, i18n);
}

export function useStageI18n() {
  return inject(StageI18nSymbol, fallbackI18n);
}
