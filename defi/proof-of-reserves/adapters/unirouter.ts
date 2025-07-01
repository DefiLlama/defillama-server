import { GetPoROptions, GetPoRResult, IPoRAdapter } from "../types";
import { getReserves } from "../utils/getReserves";
import ADDRESSES from "../../DefiLlama-Adapters/projects/helper/coreAssets.json";

const adapter: IPoRAdapter = {
  assetLabel: 'uBTC',
  reserves: async function(options: GetPoROptions): Promise<GetPoRResult> {
    return await getReserves(options, {
      bsquared: {
        minted: [{address: '0x796e4D53067FF374B89b2Ac101ce0c1f72ccaAc2'}],
        reserves: {
          countNative: true,
          owners: [
            '0xd5B5f1CA0fa5636ac54b0a0007BA374A1513346e',
            '0xe677F4B6104726D76DeBc681d7a862CE269aA8F3',
          ],
        }
      },
      bsc: {
        minted: [{address: '0x2a3DC2D5daF9c8c46C954b8669F4643C6b1C081a'}],
      },
      core: {
        minted: [{address: '0xbB4A26A053B217bb28766a4eD4b062c3B4De58ce'}],
      },
      op_bnb: {
        minted: [{address: '0xf7fB2DF9280eB0a76427Dc3b34761DB8b1441a49'}],
      },
      hemi: {
        minted: [{address: '0x78E26E8b953C7c78A58d69d8B9A91745C2BbB258'}],
      },
      sei: {
        minted: [{address: '0x78E26E8b953C7c78A58d69d8B9A91745C2BbB258'}],
      },
      mode: {
        minted: [{address: '0xd0d1b59CA62cE194E882455Fd36632d6277b192a'}],
      },
      swellchain: {
        minted: [{address: '0xFA3198ecF05303a6d96E57a45E6c815055D255b1'}],
      },
      soneium: {
        minted: [{address: '0x61F2993a644762A345b483ADF0d6351C5EdFB3b5'}],
      },
    })
  }
}

export default adapter;


