import invokeLambda from "../utils/shared/invokeLambda";
import { CloudFrontClient, CreateInvalidationCommand, } from "@aws-sdk/client-cloudfront"

let client: CloudFrontClient | null = null;

async function main() {
    if (!client)
        client = new CloudFrontClient({})
    
    const protocolToInvalidate = process.argv[2]
    const items = ['/lite/protocols2']
    if (protocolToInvalidate !== undefined) {
        items.push(`/protocol/${protocolToInvalidate}`)
        items.push(`/updatedProtocol/${protocolToInvalidate}`)
    }

    const uniqueId = "cli-" + Date.now()
    await invokeLambda(`defillama-prod-storeProtocols`, {});

    const command = new CreateInvalidationCommand({
        DistributionId: 'E1WAA6CH5260VO', /* required */
        InvalidationBatch: { /* required */
            CallerReference: uniqueId, /* required */
            Paths: { /* required */
                Quantity: items.length, /* required */
                Items: items
            }
        }
    });
    await client.send(command);
}
main()