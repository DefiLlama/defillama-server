import getTokenPrices from './stobox';

export function stobox(timestamp: number = 0) {
    console.log('starting stobox');
    return getTokenPrices(timestamp);
}
