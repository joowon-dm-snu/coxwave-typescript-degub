import { AvailableEventType, SpecialEventName, MediaType } from '@joowon.kim/analytics-types';

import { Identify } from '../../src/identify';
import {
  createTrackEvent,
  createLogEvent,
  createFeedbackEvent,
  createIdentifyRegisterEvent,
  createIdentifyUserEvent,
  createIdentifyAliasEvent,
} from '../../src/utils/event-builder';
import { uuidPattern } from '../helpers/constants';
import { ALIAS_NAME, DISTINCT_ID } from '../helpers/default';

describe('event-builder', () => {
  const uuid: string = expect.stringMatching(uuidPattern) as string;

  describe('createTrackEvent', () => {
    test('should create event', () => {
      const eventName = 'track event';
      const eventProperties = { event: 'test' };
      const predefinedProperties = { $userId: 'eventUserId' };
      const event = createTrackEvent(eventName, eventProperties, predefinedProperties);
      expect(event).toEqual({
        id: uuid,
        eventType: AvailableEventType.TRACK,
        eventName: 'track event',
        properties: {
          $userId: 'eventUserId',
          event: 'test',
        },
      });
    });

    test('should handle missing event properties', () => {
      const eventName = 'track event';
      const event = createTrackEvent(eventName);
      expect(event).toEqual({
        id: uuid,
        eventType: AvailableEventType.TRACK,
        eventName: 'track event',
        properties: {},
      });
    });
  });

  describe('createLogEvent', () => {
    test('should create event', () => {
      const eventName = 'log event';
      const eventProperties = {
        modelId: 'test-model-001',
        input: { i1: { type: MediaType.TEXT, value: 'input-text' } },
        output: { o1: { type: MediaType.TEXT, value: 'output-text' } },
      };
      const predefinedProperties = { $userId: 'eventUserId' };
      const event = createLogEvent(eventName, eventProperties, predefinedProperties);
      expect(event).toEqual({
        id: uuid,
        eventType: AvailableEventType.LOG,
        eventName: 'log event',
        modelId: 'test-model-001',
        input: { i1: { type: 'text', value: 'input-text' } },
        output: { o1: { type: 'text', value: 'output-text' } },
        properties: {
          $userId: 'eventUserId',
        },
      });
    });

    test('should handle missing event properties', () => {
      const eventName = 'log event';
      const event = createLogEvent(eventName);
      expect(event).toEqual({
        id: uuid,
        eventType: AvailableEventType.LOG,
        eventName: 'log event',
        properties: {},
      });
    });

    test('should handle simplified generation properties', () => {
      const eventName = 'log event';
      const eventProperties = {
        input: { i1: 123 },
        output: { o1: 456 },
      };
      const event = createLogEvent(eventName, eventProperties);
      expect(event).toEqual({
        id: uuid,
        eventType: AvailableEventType.LOG,
        eventName: 'log event',
        input: { i1: 123 },
        output: { o1: 456 },
        properties: {},
      });
    });
  });

  describe('createFeedbackEvent', () => {
    test('should create event', () => {
      const eventName = 'Rating';
      const eventProperties = { generationId: 'generation-id', score: 5 };
      const predefinedProperties = { $userId: 'eventUserId' };
      const event = createFeedbackEvent(eventName, eventProperties, predefinedProperties);
      expect(event).toEqual({
        id: uuid,
        eventType: AvailableEventType.FEEDBACK,
        eventName: 'Rating',
        generationId: 'generation-id',
        properties: {
          $userId: 'eventUserId',
          score: 5,
        },
      });
    });

    test('should handle missing event properties', () => {
      const eventName = 'ThumbsUp';
      const eventProperties = { generationId: 'generation-id' };
      const event = createFeedbackEvent(eventName, eventProperties);
      expect(event).toEqual({
        id: uuid,
        eventType: AvailableEventType.FEEDBACK,
        eventName: 'ThumbsUp',
        generationId: 'generation-id',
        properties: {},
      });
    });
  });

  describe('createIdentifyRegisterEvent', () => {
    test('should create event', () => {
      const event = createIdentifyRegisterEvent(DISTINCT_ID);
      expect(event).toEqual({
        id: uuid,
        eventType: AvailableEventType.IDENTIFY,
        eventName: SpecialEventName.REGISTER,
        distinctId: DISTINCT_ID,
      });
    });
  });

  describe('createIdentifyUserEvent', () => {
    test('should create event', () => {
      const alias = 'TEST_USER';
      const identify = new Identify();
      const predefinedProperties = { $userId: 'userId', $deviceId: 'deviceId' };
      const event = createIdentifyUserEvent(alias, identify, predefinedProperties);
      expect(event).toEqual({
        id: uuid,
        eventType: AvailableEventType.IDENTIFY,
        eventName: SpecialEventName.IDENTIFY,
        alias: 'TEST_USER',
        $userId: 'userId',
        $deviceId: 'deviceId',
      });
    });

    test('should handle missing deviceId', () => {
      const alias = 'TEST_USER';
      const identify = new Identify();
      const event = createIdentifyUserEvent(alias, identify);
      expect(event).toEqual({
        id: uuid,
        eventType: AvailableEventType.IDENTIFY,
        eventName: SpecialEventName.IDENTIFY,
        alias: 'TEST_USER',
      });
    });

    test('should handle missing identify', () => {
      const alias = 'TEST_USER';
      const event = createIdentifyUserEvent(alias);
      expect(event).toEqual({
        id: uuid,
        eventType: AvailableEventType.IDENTIFY,
        eventName: SpecialEventName.IDENTIFY,
        alias: 'TEST_USER',
      });
    });
  });

  describe('createIdentifyAliasEvent', () => {
    test('should create event', () => {
      const event = createIdentifyAliasEvent(ALIAS_NAME, DISTINCT_ID);
      expect(event).toEqual({
        id: uuid,
        eventType: AvailableEventType.IDENTIFY,
        eventName: SpecialEventName.ALIAS,
        alias: ALIAS_NAME,
        distinctId: DISTINCT_ID,
      });
    });
  });
});
