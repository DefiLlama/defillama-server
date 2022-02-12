module.exports = {
  "tables": [
    {
      "TableName": "test-table",
      "KeySchema": [
        { "AttributeName": "PK", "KeyType": "HASH" },
        { "AttributeName": "SK", "KeyType": "RANGE" }
      ],
      "AttributeDefinitions": [
        { "AttributeName": "PK", "AttributeType": "S" },
        { "AttributeName": "SK", "AttributeType": "N" }
      ],
      "ProvisionedThroughput": {
        "ReadCapacityUnits": 1,
        "WriteCapacityUnits": 1
      }
    }
  ],
  "basePort": 8000
}
