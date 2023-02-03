import {
  DestinationContext as Context,
  ActivityPayload,
  ActivityEvent,
  PluginCoverage,
} from '@joowon.kim/analytics-types';

import { SERVER_ACTIVITIES_PATH } from '../../constants';
import { syncServerSpec } from '../../utils/payload';

import { _BaseDestination } from './base-destination';

export class ActivityDestination extends _BaseDestination {
  name = 'coxwave-activity-destination';
  coverage = PluginCoverage.ACTIVITY;

  _createPayload(contexts: Context[]): ActivityPayload {
    return {
      activities: contexts.map((context) => {
        return syncServerSpec(context.event) as ActivityEvent;
      }),
      options: {},
    };
  }

  _createEndpointUrl(serverUrl: string) {
    return serverUrl + SERVER_ACTIVITIES_PATH;
  }
}
