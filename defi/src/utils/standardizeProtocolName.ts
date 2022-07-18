 const standardizeProtocolName = (tokenName = '') =>
	tokenName.toLowerCase().split('-').join(' ')


export default standardizeProtocolName