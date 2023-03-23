# DEX volumes

### Table

| PK (S)       | SK (N)          | [chain]              |
| ------------ | --------------- | -------------------- |
| #dv#dex#[id] | [unixTimestamp] | {[version]:[volume]} |

Example:

| PK (S)     | SK (N)     | polygon                 | ethereum                                           |
| ---------- | ---------- | ----------------------- | -------------------------------------------------- |
| dv#dex#1   | 1658016001 | {"v3": 42732808}        | {"v1": 115541.39940791792,"v3": 536833283.1319946} |
| dv#dex#306 | 1658016001 | {"quickswap": 24826410} |                                                    |

dv = daily volume

### DEX ids

Taken from `protocols/data` matching DEX category

### Run locally DEX functions

Store all DEX volumes

```
ts-node src/dexVolumes/cli/runStoreDexVolume.ts
```
