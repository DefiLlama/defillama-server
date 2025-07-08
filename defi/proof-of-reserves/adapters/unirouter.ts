import { getBitcoinReservesAdapter } from '../utils/bitcoin';

const protocolId = 'unirouter';

const mintedTokens = [
  {
    chain: 'bsquared',
    address: '0x796e4D53067FF374B89b2Ac101ce0c1f72ccaAc2',
  },
  // {
  //   chain: 'bsc',
  //   address: '0x2a3DC2D5daF9c8c46C954b8669F4643C6b1C081a',
  // },
  // {
  //   chain: 'core',
  //   address: '0xbB4A26A053B217bb28766a4eD4b062c3B4De58ce',
  // },
  // {
  //   chain: 'op_bnb',
  //   address: '0xf7fB2DF9280eB0a76427Dc3b34761DB8b1441a49',
  // },
  // {
  //   chain: 'hemi',
  //   address: '0x78E26E8b953C7c78A58d69d8B9A91745C2BbB258',
  // },
  // {
  //   chain: 'sei',
  //   address: '0x78E26E8b953C7c78A58d69d8B9A91745C2BbB258',
  // },
  // {
  //   chain: 'mode',
  //   address: '0xd0d1b59CA62cE194E882455Fd36632d6277b192a',
  // },
  // {
  //   chain: 'swellchain',
  //   address: '0xFA3198ecF05303a6d96E57a45E6c815055D255b1',
  // },
  // {
  //   chain: 'soneium',
  //   address: '0x61F2993a644762A345b483ADF0d6351C5EdFB3b5',
  // },
  // {
  //   chain: 'goat',
  //   address: '0x78E26E8b953C7c78A58d69d8B9A91745C2BbB258',
  // },
]

export default getBitcoinReservesAdapter(protocolId, mintedTokens);
