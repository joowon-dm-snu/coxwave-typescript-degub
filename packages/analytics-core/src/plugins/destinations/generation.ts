import {
  DestinationContext as Context,
  GenerationPayload,
  GenerationEvent,
  PluginCoverage,
} from '@joowon.kim/analytics-types';

import { SERVER_GENERATIONS_PATH } from '../../constants';
import { syncServerSpec } from '../../utils/payload';

import { _BaseDestination } from './base-destination';

export class GenerationDestination extends _BaseDestination {
  name = 'coxwave-generation-destination';
  coverage = PluginCoverage.GENERATION;

  _createPayload(contexts: Context[]): GenerationPayload {
    return {
      generations: contexts.map((context) => {
        return syncServerSpec(context.event) as GenerationEvent;
      }),
      options: {},
    };
  }

  _createEndpointUrl(serverUrl: string) {
    return serverUrl + SERVER_GENERATIONS_PATH;
  }
}
