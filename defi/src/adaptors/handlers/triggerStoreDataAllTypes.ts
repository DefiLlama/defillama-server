import { wrapScheduledLambda } from "../../utils/shared/wrap";
import invokeLambda from "../../utils/shared/invokeLambda";
import allSettled from "promise.allsettled/implementation";

export interface IHandlerEvent {}

export const handler = async (_event: IHandlerEvent) => {
  // volumes disabled since its still working with old implementation, shuold be enabled once migration is 100% complete
  const types = ['fees', /* 'volumes', */ 'derivatives', 'aggregators']
  await allSettled(types.map(type=>invokeLambdaByType(type)))
};

const invokeLambdaByType = async (type: string) => {
  const event = {
    adaptorType: type
  };
  invokeLambda(`defillama-prod-storeAdaptorData`, event)
}

export default wrapScheduledLambda(handler);
