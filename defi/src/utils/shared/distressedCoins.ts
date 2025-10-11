import { storeR2JSONString, getR2JSONString } from "../../utils/r2";
import { chainsThatShouldNotBeLowerCased } from "../../utils/shared/constants";

const r2Key = "distressedAssetsList.json";

export async function isDistressed(key: string) {
  const chain = key.split(":")[0];
  const address = key.substring(chain.length + 1);
  const normalizedAddress = chainsThatShouldNotBeLowerCased.includes(chain)
    ? address
    : address.toLowerCase();
  const data = await getR2JSONString(r2Key);

  if (!data[chain]) return false;
  if (data[chain][normalizedAddress]) return true;

  return false;
}

export async function addToDistressedList(key: string) {
  const chain = key.split(":")[0];
  const address = key.substring(chain.length + 1);
  const normalizedAddress = chainsThatShouldNotBeLowerCased.includes(chain)
    ? address
    : address.toLowerCase();
  const data = await getR2JSONString(r2Key);

  if (!data[chain]) data[chain] = {};
  data[chain].push(normalizedAddress);

  await storeR2JSONString(r2Key, JSON.stringify(data));
}