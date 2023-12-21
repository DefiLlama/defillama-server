import dynamodb from "../utils/shared/dynamodb";

async function main(){
    console.log(await dynamodb.get({PK:`asset#${process.argv[2]}`, SK:0}))
}
main()

// Example:
// tableName='prod-coins-table' AWS_REGION='eu-central-1' npx ts-node src/cli/readItem.ts cardano:fbae99b8679369079a7f6f0da14a2cf1c2d6bfd3afdf3a96a64ab67a0014df1047454e5358