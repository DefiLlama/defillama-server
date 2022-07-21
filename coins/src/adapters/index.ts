export default {
  aave: require("./moneyMarkets/aave/index"),
  geist: require("./moneyMarkets/aave/index"),
  compound: require("./moneyMarkets/compound/index"),
  curve: require("./lps/curve/index"),
  yearn: require("./yield/yearn/index"),
  uniswap: require("./lps/uniswap/index"),
  pancakeswap: require("./lps/uniswap/index")
};
