export interface GetPoROptions {
  timestamp: number;
}

export interface IPoRAdapter {
  // total assets were minted/issued across all destination blockchains
  minted: (options: GetPoROptions) => Promise<{[key: string]: number}>;

  // total backing assets are being locked across all source blockchains
  unrelaesed: (options: GetPoROptions) => Promise<{[key: string]: number}>;
}
