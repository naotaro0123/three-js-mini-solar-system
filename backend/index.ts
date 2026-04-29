import { Hono } from "hono";
import { cors } from "hono/cors";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import {
  commandMap,
  planetPositionEndpoint,
  type RequestQueryBody,
  type ResponseData,
} from "../common";

const app = new Hono();

app.use(cors({
  origin: 'https://naotaro0123.github.io/three-js-mini-solar-system'
}));

const isCommandKey = (value: string): value is keyof typeof commandMap =>
  value in commandMap;

const isResponseData = (data: unknown): data is ResponseData => {
  if (typeof data !== "object" || data === null) {
    return false;
  }

  if (!("result" in data) || typeof data.result !== "string") {
    return false;
  }

  if (!("signature" in data)) {
    return false;
  }

  const signature = data.signature;
  if (typeof signature !== "object" || signature === null) {
    return false;
  }

  return (
    "version" in signature &&
    typeof signature.version === "string" &&
    "source" in signature &&
    typeof signature.source === "string"
  );
};

const isContentfulStatusCode = (
  statusCode: number,
): statusCode is ContentfulStatusCode =>
  Number.isInteger(statusCode) && statusCode >= 100 && statusCode <= 599;

app.use(
  "/api/*",
  cors({
    origin: ["http://localhost:5173"], // 許可するオリジンを指定
  }),
);

app.get(planetPositionEndpoint, async (c) => {
  // クエリパラメータから取得
  const query = c.req.query();
  const { START_TIME, STOP_TIME, STEP_SIZE, COMMAND } = query;

  if (
    !START_TIME ||
    !STOP_TIME ||
    !STEP_SIZE ||
    !COMMAND ||
    !isCommandKey(COMMAND)
  ) {
    return c.json(
      {
        error: "必須項目がありません",
      },
      400,
    );
  }

  const requestQuery = {
    START_TIME,
    STOP_TIME,
    STEP_SIZE,
    COMMAND,
  } satisfies RequestQueryBody;

  const commandValue = commandMap[requestQuery.COMMAND];
  // 外部APIのURLを作成
  // Doc: https://ssd-api.jpl.nasa.gov/doc/horizons.html
  // ref: https://gemini.google.com/app/8aa75ba3ab0dece5
  const externalApiUrl =
    "https://ssd.jpl.nasa.gov/api/horizons.api?format=json&" +
    `COMMAND='${commandValue}'&` +
    `OBJ_DATA='NO'&MAKE_EPHEM='YES'&` +
    `EPHEM_TYPE='VECTORS'&` +
    `CENTER='@sun'&` +
    `START_TIME='${START_TIME}'&` +
    `STOP_TIME='${STOP_TIME}'&` +
    `STEP_SIZE='${STEP_SIZE}'&` +
    `OUT_UNITS='AU-D'&` +
    `VEC_TABLE='1'`;
  try {
    const response = await fetch(externalApiUrl);

    if (!response.ok) {
      // 外部APIからの非200レスポンスを処理
      const statusCode = isContentfulStatusCode(response.status)
        ? response.status
        : 502;
      return c.json(
        { error: "外部APIからのデータ取得に失敗しました。" },
        statusCode,
      );
    }

    const data = await response.json();
    if (!isResponseData(data)) {
      return c.json({ error: "外部APIのレスポンス形式が不正です。" }, 502);
    }

    // 外部APIからのデータをそのまま返す
    return c.json(data);
  } catch (error) {
    // ネットワークエラーなどを処理
    console.error("APIの取得エラー:", error);
    return c.json({ error: "サーバー内部でエラーが発生しました。" }, 500);
  }
});

export default {
  port: 3000,
  fetch: app.fetch,
};
