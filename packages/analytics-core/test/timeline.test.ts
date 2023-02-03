import { Event, Plugin, PluginCoverage, PluginType } from '@joowon.kim/analytics-types';

import { Timeline } from '../src/timeline';
import {
  createFeedbackEvent,
  createIdentifyRegisterEvent,
  createLogEvent,
  createTrackEvent,
} from '../src/utils/event-builder';

import { useDefaultConfig, promiseState } from './helpers/default';

describe('timeline', () => {
  let timeline = new Timeline();

  beforeEach(() => {
    timeline = new Timeline();
  });

  test('should update event using before/enrichment plugin', async () => {
    const beforeSetup = jest.fn().mockReturnValue(Promise.resolve());
    const beforeExecute = jest.fn().mockImplementation((event: Event) =>
      Promise.resolve({
        ...event,
        id: '1',
      }),
    );
    const before: Plugin = {
      name: 'plugin:before',
      type: PluginType.BEFORE,
      setup: beforeSetup,
      execute: beforeExecute,
    };
    const enrichmentSetup = jest.fn().mockReturnValue(Promise.resolve());
    const enrichmentExecute = jest.fn().mockImplementation((event: Event) =>
      Promise.resolve({
        ...event,
        properties: { $userId: '2' },
      }),
    );
    const enrichment: Plugin = {
      name: 'plugin:enrichment',
      type: PluginType.ENRICHMENT,
      setup: enrichmentSetup,
      execute: enrichmentExecute,
    };

    const destinationSetup = jest.fn().mockReturnValue(Promise.resolve());
    const destinationExecute = jest
      .fn()
      // error once
      .mockImplementationOnce((event: Event) => {
        expect(event.id).toBe('1');
        expect(event.properties?.$userId).toBe('2');
        return Promise.reject({});
      })
      // success for the rest
      .mockImplementation((event: Event) => {
        expect(event.id).toBe('1');
        expect(event.properties?.$userId).toBe('2');
        return Promise.resolve();
      });
    const destination: Plugin = {
      name: 'plugin:destination',
      type: PluginType.DESTINATION,
      coverage: PluginCoverage.ACTIVITY,
      setup: destinationSetup,
      execute: destinationExecute,
    };
    const config = useDefaultConfig();
    // register
    await timeline.register(before, config);
    await timeline.register(enrichment, config);
    await timeline.register(destination, config);

    expect(beforeSetup).toHaveBeenCalledTimes(1);
    expect(enrichmentSetup).toHaveBeenCalledTimes(1);
    expect(destinationSetup).toHaveBeenCalledTimes(1);
    expect(timeline.plugins.length).toBe(3);
    const event = (id: number): Event => ({
      id: 'uuid',
      eventType: '$track',
      eventName: `${id}:eventName`,
    });
    await Promise.all([
      timeline.push(event(1)).then(() => timeline.push(event(1.1))),
      timeline.push(event(2)).then(() => Promise.all([timeline.push(event(2.1)), timeline.push(event(2.2))])),
      timeline
        .push(event(3))
        .then(() =>
          Promise.all([
            timeline.push(event(3.1)).then(() => Promise.all([timeline.push(event(3.11)), timeline.push(event(3.12))])),
            timeline.push(event(3.2)),
          ]),
        ),
    ]);
    expect(beforeExecute).toHaveBeenCalledTimes(10);
    expect(enrichmentExecute).toHaveBeenCalledTimes(10);
    expect(destinationExecute).toHaveBeenCalledTimes(10);

    // deregister
    await timeline.deregister(before.name);
    await timeline.deregister(enrichment.name);
    await timeline.deregister(destination.name);
    expect(timeline.plugins.length).toBe(0);
  });

  describe('push', () => {
    test('should skip event processing when config is missing', async () => {
      const event: Event = {
        id: 'uuid',
        eventType: '$track',
        eventName: 'hello',
      };
      const result = timeline.push(event);
      expect(await promiseState(result)).toEqual('pending');
      expect(timeline.queue.length).toBe(1);
    });
  });

  describe('apply', () => {
    test('should handle undefined event', async () => {
      const beforeSetup = jest.fn().mockReturnValueOnce(Promise.resolve());
      const beforeExecute = jest.fn().mockImplementationOnce((event: Event) =>
        Promise.resolve({
          ...event,
          id: '1',
        }),
      );
      const before: Plugin = {
        name: 'plugin:before',
        type: PluginType.BEFORE,
        setup: beforeSetup,
        execute: beforeExecute,
      };
      const config = useDefaultConfig();
      await timeline.register(before, config);
      await timeline.apply(undefined);
      await timeline.deregister(before.name);
      expect(beforeExecute).toHaveBeenCalledTimes(0);
    });

    test('should handle track event', async () => {
      const destSetup = jest.fn().mockReturnValueOnce(Promise.resolve());
      const destExecute = jest.fn().mockImplementationOnce(() => Promise.resolve());
      const activityDest: Plugin = {
        name: 'plugin:before',
        type: PluginType.DESTINATION,
        coverage: PluginCoverage.ACTIVITY,
        setup: destSetup,
        execute: destExecute,
      };
      const config = useDefaultConfig();
      await timeline.register(activityDest, config);
      await timeline.apply([createTrackEvent('a'), () => ({})]);
      expect(destExecute).toHaveBeenCalledTimes(1);
    });

    test('should handle log event', async () => {
      const destSetup = jest.fn().mockReturnValueOnce(Promise.resolve());
      const destExecute = jest.fn().mockImplementationOnce(() => Promise.resolve());
      const activityDest: Plugin = {
        name: 'plugin:before',
        type: PluginType.DESTINATION,
        coverage: PluginCoverage.GENERATION,
        setup: destSetup,
        execute: destExecute,
      };
      const config = useDefaultConfig();
      await timeline.register(activityDest, config);
      await timeline.apply([createLogEvent('a'), () => ({})]);
      expect(destExecute).toHaveBeenCalledTimes(1);
    });

    test('should handle feedback event', async () => {
      const destSetup = jest.fn().mockReturnValueOnce(Promise.resolve());
      const destExecute = jest.fn().mockImplementationOnce(() => Promise.resolve());
      const activityDest: Plugin = {
        name: 'plugin:before',
        type: PluginType.DESTINATION,
        coverage: PluginCoverage.FEEDBACK,
        setup: destSetup,
        execute: destExecute,
      };
      const config = useDefaultConfig();
      await timeline.register(activityDest, config);
      await timeline.apply([createFeedbackEvent('a', { generationId: 'a' }), () => ({})]);
      expect(destExecute).toHaveBeenCalledTimes(1);
    });

    test('should handle identify event', async () => {
      const destSetup = jest.fn().mockReturnValueOnce(Promise.resolve());
      const destExecute = jest.fn().mockImplementationOnce(() => Promise.resolve());
      const activityDest: Plugin = {
        name: 'plugin:before',
        type: PluginType.DESTINATION,
        coverage: PluginCoverage.IDENTIFY,
        setup: destSetup,
        execute: destExecute,
      };
      const config = useDefaultConfig();
      await timeline.register(activityDest, config);
      await timeline.apply([createIdentifyRegisterEvent('a'), () => ({})]);
      expect(destExecute).toHaveBeenCalledTimes(1);
    });
  });

  describe('flush', () => {
    test('should flush events', async () => {
      const setup = jest.fn().mockReturnValueOnce(Promise.resolve(undefined));
      const execute = jest.fn().mockReturnValue(Promise.resolve(undefined));
      const flush = jest.fn().mockReturnValue(Promise.resolve(undefined));
      const plugin = {
        name: 'mock',
        type: PluginType.DESTINATION,
        coverage: PluginCoverage.ACTIVITY,
        setup,
        execute,
        flush,
      };
      const config = useDefaultConfig();
      await timeline.register(plugin, config);
      void timeline.push(createTrackEvent('a'));
      void timeline.push(createTrackEvent('b'));
      void timeline.push(createTrackEvent('c'));
      void timeline.push(createTrackEvent('d'));
      expect(timeline.queue.length).toBe(4);
      await timeline.flush();
      expect(timeline.queue.length).toBe(0);
      expect(execute).toHaveBeenCalledTimes(4);
      expect(flush).toHaveBeenCalledTimes(1);
    });
  });
});
