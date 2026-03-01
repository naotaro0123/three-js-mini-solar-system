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

app.use(
  "/api/*",
  cors({
    origin: ["http://localhost:5173"], // 許可するオリジンを指定
  }),
);

app.get(planetPositionEndpoint, async (c) => {
  // クエリパラメータから取得
  const { START_TIME, STOP_TIME, STEP_SIZE, COMMAND } =
    c.req.query() as RequestQueryBody;
  // TODO: asばかりなのでsatisfiesを使いたい

  if (!START_TIME || !STOP_TIME || !STEP_SIZE || !COMMAND) {
    return c.json(
      {
        error: "必須項目がありません",
      },
      400,
    );
  }

  const commandValue = commandMap[COMMAND];
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
      return c.json(
        { error: "外部APIからのデータ取得に失敗しました。" },
        response.status as ContentfulStatusCode,
      );
    }

    const data = (await response.json()) as ResponseData;

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
