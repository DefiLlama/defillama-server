export abstract class Item<T=string, K=number> {
    abstract get pk(): T
    abstract get sk(): K

    public keys() {
        return {
            PK: this.pk,
            SK: this.sk
        }
    }

    abstract toItem(): Record<string, unknown>
}