import csv
import requests
import json

# First download all.csv from defillama and then place it in the same directory as this script

r = requests.get('https://api.coingecko.com/api/v3/coins/list').json()
tokens = {
    "ethereum": "WETH" # to merge it with regular weth
}
unmatchedTokens = set()

ll = len("coingecko:")

csvfile = open("all.csv", "r")
datareader = csv.reader(csvfile)
for row in datareader:
    if row[4].startswith("coingecko:"):
        row[4] = row[4][ll:]
    if row[3] == "Tokens" and "0x" not in row[4] and row[4].lower() == row[4] and row[4] not in tokens and row[4] not in unmatchedTokens:
        symbol = next((x for x in r if x["id"]==row[4]), None)
        if symbol == None:
            print(row[4])
            unmatchedTokens.add(row[4])
        else:
            tokens[row[4]] = symbol["symbol"].upper()

w = open('../utils/symbols/symbols.json', 'w')
json.dump(tokens, w)