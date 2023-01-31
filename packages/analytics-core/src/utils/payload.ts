import { Event, IdentifyEvent } from '@coxwave/analytics-types';

export const syncServerSpec = (event: Event): Event => {
  const syncedEvent = {
    ...event,
    distinctId: event.properties?.$distinctId,
    threadId: event.properties?.$threadId,
    name: event.eventName,
    time: event.properties?.$time || new Date().getTime(),
  };
  return syncedEvent;
};

export const syncIdentifyServerSpec = (event: IdentifyEvent): IdentifyEvent => {
  const { properties, ...eventWithoutProperties } = event;
  return eventWithoutProperties;
};
