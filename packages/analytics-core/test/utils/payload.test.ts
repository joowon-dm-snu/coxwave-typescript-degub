import { AvailableEventType, BaseEvent, IdentifyEvent, SpecialEventName } from '@coxwave/analytics-types';

import { syncServerSpec, syncIdentifyServerSpec } from '../../src/utils/payload';
import { ALIAS_NAME } from '../helpers/default';

describe('payload', () => {
  describe('syncServerSpec', () => {
    test('should align with server API spec', () => {
      const eventName = 'track event';
      const eventProperties = {
        $userId: 'eventUserId',
        $distinctId: 'eventDistinctId',
        $threadId: 'eventThreadId',
        $time: 1234567890,
      };
      const event: BaseEvent = {
        id: 'uuid',
        eventType: AvailableEventType.TRACK,
        eventName: eventName,
        properties: {
          ...eventProperties,
        },
      };
      const syncedEvent = syncServerSpec(event);

      expect(syncedEvent).toEqual({
        id: 'uuid',
        eventType: AvailableEventType.TRACK,
        eventName: eventName,
        name: eventName,
        properties: {
          $userId: 'eventUserId',
          $distinctId: 'eventDistinctId',
          $threadId: 'eventThreadId',
          $time: 1234567890,
        },
        distinctId: 'eventDistinctId',
        threadId: 'eventThreadId',
        time: 1234567890,
      });
    });

    describe('syncIdentifyServerSpec', () => {
      test('should align with server API spec', () => {
        const eventProperties = {
          $userId: 'eventUserId',
          $distinctId: 'eventDistinctId',
          $threadId: 'eventThreadId',
          $time: 1234567890,
        };
        const event: IdentifyEvent = {
          id: 'uuid',
          alias: ALIAS_NAME,
          eventType: AvailableEventType.IDENTIFY,
          eventName: SpecialEventName.IDENTIFY,
          properties: {
            ...eventProperties,
          },
        };
        const syncedEvent = syncIdentifyServerSpec(event);

        expect(syncedEvent).toEqual({
          id: 'uuid',
          eventType: AvailableEventType.IDENTIFY,
          eventName: SpecialEventName.IDENTIFY,
          alias: ALIAS_NAME,
        });
      });
    });
  });
});
