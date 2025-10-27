export const withTimeout = (millis: number, promise: any, id: string = "") => {
  let timeoutId: NodeJS.Timeout;
  
  const timeout = new Promise((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(`${id} timed out after ${millis / 1000} s.`);
    }, millis);
  });
  
  return Promise.race([promise, timeout]).finally(() => {
    clearTimeout(timeoutId);
  });
};