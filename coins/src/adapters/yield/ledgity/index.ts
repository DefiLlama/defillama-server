import { calculate4626Prices } from '../../utils/erc4626';

const vaultConfig: {
	[chain: string]: {
		lyUSD?: string;
		lyEUR?: string;
	};
} = {
	ethereum: {
		lyUSD: '0x3C769d0e8D21d380228dFB7918c6933bb6ecB6D4',
		lyEUR: '0x20968165B7d2cDF33aF632aAB3e0539848d44BC8',
	},
	sonic: {
		lyUSD: '0x65f75c675Cc76474662DfBF7B6e8683764223001',
	},
	arbitrum: {
		lyUSD: '0x283F35b6406a0e19a786ed119869eF2c0fE157Ee',
	},
	base: {
		lyUSD: '0x916f179D5D9B7d8Ad815AC2f8570aabF0C6a6e38',
		lyEUR: '0xFaA1e3720e6Ef8cC76A800DB7B3dF8944833b134',
	},
	linea: {
		lyUSD: '0x43b3c64dbc95F9eD83795E051fc00014059e698F',
	},
};

export function ledgity(timestamp: number = 0) {
	return Promise.all(
		Object.keys(vaultConfig).map((chain) => {
			const config = vaultConfig[chain];
			if (!config) return [];

			const tokens = Object.values(config);
			return calculate4626Prices(chain, timestamp, tokens, 'ledgity');
		}),
	);
}
