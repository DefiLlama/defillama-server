export const withTimeout = (millis: number, promise: any, id: string = "") => {
  const timeout = new Promise((resolve, reject) =>
    setTimeout(() => {
      reject(`${id} timed out after ${millis / 1000} s.`);
      resolve;
    }, millis)
  );
  return Promise.race([promise, timeout]);
};
