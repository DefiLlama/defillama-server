import {
  successResponse,
  wrap,
  IResponse,
  errorResponse,
} from "./utils/shared";
import parseRequestBody from "./utils/shared/parseRequestBody";
import { getBasicCoins } from "./utils/getCoinsUtils";
import { insertCoins } from "./utils/unifiedInserts";
import { getCurrentUnixTimestamp } from "./utils/date";
import { coinToPK } from "./utils/processCoin";

const validKeys = [
  "symbol",
  "isDistressed",
  "confidence",
  "decimals",
  "redirect",
];

const handler = async (event: any): Promise<IResponse> => {
  const stringBody = parseRequestBody(event.body);

  const body: { [key: string]: any } = {};
  Object.keys(stringBody).forEach((key) => {
    if (stringBody[key] == "true") body[key] = true;
    else if (stringBody[key] == "false") body[key] = false;
    else if (!isNaN(Number(stringBody[key])))
      body[key] = Number(stringBody[key]);
    else body[key] = stringBody[key];
  });

  const queries = [body.coin, body.redirect].filter(Boolean);
  const { coins } = await getBasicCoins(queries);
  
  const PK = coinToPK(body.coin);
  const currentCoin = coins.find((coin) => coin.PK == PK);
  const redirectCoin = coins.find(
    (coin) => (coin.PK = coinToPK(body.redirect))
  );
    if (body.redirect && !redirectCoin)
      return errorResponse({
        message: `Redirect coin not found: ${body.redirect}`,
      });

  let write = {
    timestamp: getCurrentUnixTimestamp(),
    adapter: "insert-endpoint",
    PK,
    SK: 0,
  } as any;
  const response: { [key: string]: string } = {};

  if (currentCoin) {
    Object.keys(body).forEach((key: string) => {
      if (key === "coin") return;
      if (!validKeys.includes(key))
        return errorResponse({ message: `Invalid key: ${key}` });

      write[key] = body[key];
      if (!currentCoin) return;
      response[key] = `from ${currentCoin[key]} to ${body[key]}`;
    });

    write = { ...currentCoin, ...write };
  } else {
    write = { ...body, ...write };
    response[body.coin] = "new";
  }

  delete write.coin;
  await insertCoins([write], { topics: ["coins-metadata"] });
  return successResponse(response);
};

export default wrap(handler);