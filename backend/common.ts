// TODO: バックエンドとフロントエンドの共通定義にできるようにする

// 199: 水星, 299: 金星, 399: 地球, 499: 火星, 599: 木星, 699: 土星, 799: 天王星, 899: 海王星, 999: 冥王星
export const commandMap = {
  MERCURY: "199",
  VENUS: "299",
  EARTH: "399",
  MARS: "499",
  JUPITER: "599",
  SATURN: "699",
  URANUS: "799",
  NEPTUNE: "899",
  PLUTO: "999",
} as const;

export type RequestQueryBody = {
  START_TIME: string;
  STOP_TIME: string;
  STEP_SIZE: string;
  COMMAND: keyof typeof commandMap;
};

export type ResponseData = {
  result: string;
  signature: {
    version: string;
    source: string;
  };
};

export const planetPositionEndpoint = "/api/v1/planet-position";
