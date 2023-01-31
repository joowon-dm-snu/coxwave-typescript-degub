export { SpecialActivityPropertyKey, TSpecialActivityPropertyKey, ActivityProperties, ActivityEvent } from './activity';
export {
  AvailableEventType,
  TAvailableEventType,
  SpecialEventName,
  TSpecialEventName,
  BaseEvent,
  PredefinedProperties,
  ValidPropertyType,
} from './base-event';
export { SpecialFeedbackPropertyKey, TSpecialFeedbackPropertyKey, FeedbackProperties, FeedbackEvent } from './feedback';
export {
  MediaType,
  TMediaType,
  SpecialGenerationPropertyKey,
  TSpecialGenerationPropertyKey,
  GenerationIOEntity,
  GenerationProperties,
  GenerationEvent,
} from './generation';
export {
  SpecialIdentifyPropertyKey,
  TSpecialIdentifyPropertyKey,
  IdentifyProperties,
  Identify,
  IdentifyOperation,
  IdentifyRegisterEvent,
  IdentifyRegisterProperties,
  IdentifyUserEvent,
  IdentifyUserProperties,
  IdentifyAliasEvent,
  IdentifyAliasProperties,
} from './identity';

import { ActivityEvent } from './activity';
import { FeedbackEvent } from './feedback';
import { GenerationEvent } from './generation';
import { IdentifyRegisterEvent, IdentifyUserEvent, IdentifyAliasEvent } from './identity';

export type Event = ActivityEvent | FeedbackEvent | GenerationEvent | IdentifyEvent;
export type IdentifyEvent = IdentifyRegisterEvent | IdentifyUserEvent | IdentifyAliasEvent;
