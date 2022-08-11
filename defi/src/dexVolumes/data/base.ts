export abstract class Item {
    abstract get pk(): string
    abstract get sk(): number

    public keys() {
        return {
            PK: this.pk,
            SK: this.sk
        }
    }

    abstract toItem(): Record<string, unknown>
}