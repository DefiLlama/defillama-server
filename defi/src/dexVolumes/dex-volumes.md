# DEX volumes

### Table

| PK (S)                        | SK (N)          |
| ----------------------------- | --------------- |
| {chain}#dv#dex#{id}           | {unixTimestamp} |
| {chain}#dv#dex#{id}#{version} | {unixTimestamp} |

dv = daily volume

### DEX ids

Taken from `protocols/data` matching DEX category

### Run locally DEX functions

Store all DEX volumes

```
ts-node src/dexVolumes/cli/runStoreDexVolume.ts
```
