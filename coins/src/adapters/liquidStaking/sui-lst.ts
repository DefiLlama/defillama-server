import getWrites from "./../utils/getWrites";
import { Write } from "./../utils/dbInterfaces";
import { getObjects, queryEvents, getTokenInfo } from "./../utils/sui";
import { getTokenAndRedirectDataMap } from "../utils/database";
const LST_CREATE_EVENT_TYPE = '0xb0575765166030556a6eafd3b1b970eba8183ff748860680245b9edd41c716e7::events::Event<0xb0575765166030556a6eafd3b1b970eba8183ff748860680245b9edd41c716e7::liquid_staking::CreateEvent>';

const lsts = [
  '0x83556891f4a0f233ce7b05cfe7f957d4020492a34f5405b2cb9377d060bef4bf::spring_sui::SPRING_SUI',
  '0x922d15d7f55c13fd790f6e54397470ec592caa2b508df292a2e8553f3d3b274f::msui::MSUI',
  '0x02358129a7d66f943786a10b518fdc79145f1fc8d23420d9948c4aeea190f603::fud_sui::FUD_SUI',
  '0x41ff228bfd566f0c707173ee6413962a77e3929588d010250e4e76f0d1cc0ad4::ksui::KSUI',
  '0x502867b177303bf1bf226245fcdd3403c177e78d175a55a56c0602c7ff51c7fa::trevin_sui::TREVIN_SUI',
  '0xe68fad47384e18cd79040cb8d72b7f64d267eebb73a0b8d54711aa860570f404::upsui::UPSUI',
  '0x83f1bb8c91ecd1fd313344058b0eed94d63c54e41d8d1ae5bff1353443517d65::yap_sui::YAP_SUI',
  '0x285b49635f4ed253967a2a4a5f0c5aea2cbd9dd0fc427b4086f3fad7ccef2c29::i_sui::I_SUI',
  '0xaded77ced91afca17e03306d24962f782a51c7395eaf0e7bc1e08ac0dca0fd52::fl_sui::FL_SUI',
  '0x95f9ff87d8e0640cb3369bb470761b9ec46eb0ff3cc1eed417df4fa24c853f42::oshi_sui::OSHI_SUI',
  '0xb2d912e4f100e03b7de58d874835e358dc2802f2fb8559f56a70a7c900f8fc78::jug_sui::JUG_SUI',
  '0x1fea5652ae6ba58120a3262cff764b5abefe39ce603cdd5c5ca19fc584b6847e::strat_sui::STRAT_SUI',
  '0x5a71532c1e812daeffd07ef375451fad7a2906d01151bade4d5018ffc5a3c267::o_sui::O_SUI',
  '0x5fb5365e645d9728660e4ba13cb1c8eefcb950e7c20472c168d97adb36b7415c::fp_sui::FP_SUI',
]

const whitelistedLSTSet = new Set(lsts);

export async function suiLST(timestamp: number = 0): Promise<Write[]> {
  if (timestamp != 0) throw new Error("Can't fetch historical data")

  const events = (await queryEvents({ eventType: LST_CREATE_EVENT_TYPE, }))
  const poolData = await getObjects(events.map((e: any) => e.event.liquid_staking_info_id));
  const coinDatas = await getTokenAndRedirectDataMap(lsts, "sui", timestamp)

  Object.keys(coinDatas).forEach((coinType) => {
    coinDatas[coinType.toLowerCase()] = coinDatas[coinType];
  })

  const pricesObject: any = {};

  for (let i = 0; i < events.length; i++) {
    const event: any = events[i];
    const data = poolData[i];
    const coinType = '0x' + event.event.typename.name
    const coinsData = coinDatas[coinType.toLowerCase()]
    let decimals, symbol
    if (!whitelistedLSTSet.has(coinType)) continue;

    if (!coinsData) {
      const cgData = await getTokenInfo(coinType,);
      decimals = cgData.decimals;
      symbol = cgData.symbol;
    } else {
      decimals = coinsData.decimals;
      symbol = coinsData.symbol;
    }


    const totalSupply = parseInt(data.fields.lst_treasury_cap.fields.total_supply.fields.value);
    const stakedSui = parseInt(data.fields.storage.fields.total_sui_supply);

    const price = stakedSui / totalSupply

    pricesObject[coinType] = {
      underlying: "0x2::sui::SUI",
      price,
      decimals, symbol,
    };
  }

  return getWrites({
    chain: "sui",
    timestamp,
    pricesObject,
    projectName: "suiLST",
  });
}
