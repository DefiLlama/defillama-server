export async function sleep(time: number) {
  return new Promise((resolve) => setTimeout(resolve, time))
}

export function formatAddress(address: any): string {
  return String(address).toLowerCase();
}
