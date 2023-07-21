export const withTimeout = (millis: number, promise: any) => {
  const timeout = new Promise((resolve, reject) =>
    setTimeout(() => {
      reject(`timed out after ${millis / 1000} s.`);
      resolve;
    }, millis),
  );
  return Promise.race([promise, timeout]);
};
