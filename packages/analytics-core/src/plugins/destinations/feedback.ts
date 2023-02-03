import {
  DestinationContext as Context,
  FeedbackPayload,
  FeedbackEvent,
  PluginCoverage,
} from '@joowon.kim/analytics-types';

import { SERVER_FEEDBACKS_PATH } from '../../constants';
import { syncServerSpec } from '../../utils/payload';

import { _BaseDestination } from './base-destination';

export class FeedbackDestination extends _BaseDestination {
  name = 'coxwave-feedback-destination';
  coverage = PluginCoverage.FEEDBACK;

  _createPayload(contexts: Context[]): FeedbackPayload {
    return {
      feedbacks: contexts.map((context) => {
        return syncServerSpec(context.event) as FeedbackEvent;
      }),
      options: {},
    };
  }

  _createEndpointUrl(serverUrl: string) {
    return serverUrl + SERVER_FEEDBACKS_PATH;
  }
}
