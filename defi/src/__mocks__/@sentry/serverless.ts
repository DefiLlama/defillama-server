/* eslint-disable import/prefer-default-export */
const AWSLambda = {
  init: () => {},
  wrapHandler: (f: Function) => f,
  captureException() {},
};

export { AWSLambda };
