import invokeLambda from "../utils/shared/invokeLambda";
import aws from "aws-sdk";

async function main() {
    const protocolToInvalidate = process.argv[2]
    const items = ['/lite/protocols2']
    if(protocolToInvalidate !== undefined){
        items.push(`/protocol/${protocolToInvalidate}`)
        items.push(`/updatedProtocol/${protocolToInvalidate}`)
    }

    const uniqueId = "cli-" + Date.now()
    await invokeLambda(`defillama-prod-storeProtocols`, {});
    await new aws.CloudFront().createInvalidation({
        DistributionId: 'E1WAA6CH5260VO', /* required */
        InvalidationBatch: { /* required */
            CallerReference: uniqueId, /* required */
            Paths: { /* required */
                Quantity: items.length, /* required */
                Items: items
            }
        }
    }).promise();
}
main()