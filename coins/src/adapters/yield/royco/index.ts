import getDSVSharePrice from "./roycoDSV";

export function royco(timestamp: number = 0) {
    return Promise.all([
        getDSVSharePrice("ethereum", timestamp),
    ]);
}
