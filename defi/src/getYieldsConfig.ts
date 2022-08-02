import { cache20MinResponse, wrap, IResponse } from "./utils/shared";
import protocols from "./protocols/data";
import sluggify from "./utils/sluggify";

const handler = async (
    _event: AWSLambda.APIGatewayEvent
): Promise<IResponse> => {
    return cache20MinResponse({
        protocols: protocols.reduce((all, p) => ({
            ...all,
            [sluggify(p)]: {
                name: p.name,
                audits: p.audits,
                audit_links: p.audit_links,
                url: p.url,
                twitter: p.twitter,
                category: p.category,
                symbol: p.symbol,
            }
        }), {}),
    });
};

export default wrap(handler);
