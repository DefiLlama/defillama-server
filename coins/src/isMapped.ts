import { successResponse, wrap, IResponse } from "./utils/shared";
import { CoinsResponse, getBasicCoins } from "./utils/getCoinsUtils";

const handler = async (event: any): Promise<IResponse> => {
  const requestedCoins = (event.pathParameters?.coins ?? "").split(",");
  const { PKTransforms, coins } = await getBasicCoins(requestedCoins);
  const response = {} as CoinsResponse;
  coins.forEach((coin) => {
    PKTransforms[coin.PK].forEach((coinName) => {
      response[coinName] = coin.redirect;
    });
  });

  // Coingecko price refreshes happen each 5 minutes, set expiration at the :00; :05, :10, :15... mark, with 20 seconds extra
  const date = new Date();
  const minutes = date.getMinutes();
  date.setMinutes(minutes + 5 - (minutes % 5));
  date.setSeconds(20);
  return successResponse(
    {
      coins: response,
    },
    undefined,
    {
      Expires: date.toUTCString(),
    }
  );
};

export default wrap(handler);
