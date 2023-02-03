import { AvailableEventType, Event, Plugin, PluginType, Status } from '@joowon.kim/analytics-types';

import { CoxwaveCore, Identify } from '../src/index';
import { CLIENT_NOT_INITIALIZED, OPT_OUT_MESSAGE } from '../src/messages';

import { useDefaultConfig, DISTINCT_ID } from './helpers/default';

describe('core-client', () => {
  const success = {
    id: 'uuid',
    event: { id: 'uuid', eventType: AvailableEventType.TRACK, eventName: 'sample' },
    code: 200,
    message: Status.Success,
    body: {},
  };
  const badRequest = {
    id: 'uuid',
    event: { id: 'uuid', eventType: AvailableEventType.TRACK, eventName: 'sample' },
    code: 400,
    message: Status.Invalid,
    body: {},
  };
  const client = new CoxwaveCore();

  const alias = 'my-alias';

  describe('init', () => {
    test('should call init', async () => {
      expect(client.config).toBeUndefined();
      await client._init(useDefaultConfig());
      expect(client.config).toBeDefined();
    });
  });

  describe('track', () => {
    test('should call track', async () => {
      const dispatch = jest.spyOn(client, 'dispatch').mockReturnValueOnce(Promise.resolve(success));
      const eventName = 'eventName';
      const eventProperties = { event: 'test' };
      const response = await client.track(eventName, eventProperties).promise;
      expect(response).toEqual(success);
      expect(dispatch).toHaveBeenCalledTimes(1);
    });
  });

  describe('log', () => {
    test('should call log', async () => {
      const dispatch = jest.spyOn(client, 'dispatch').mockReturnValueOnce(Promise.resolve(success));
      const eventName = 'eventName';
      const eventProperties = { event: 'test' };
      const response = await client.log(eventName, eventProperties).promise;
      expect(response).toEqual(success);
      expect(dispatch).toHaveBeenCalledTimes(1);
    });
  });

  describe('feedback', () => {
    test('should call feedback', async () => {
      const dispatch = jest.spyOn(client, 'dispatch').mockReturnValueOnce(Promise.resolve(success));
      const eventName = 'Rating';
      const eventProperties = { generationId: '123123' };
      const response = await client.feedback(eventName, eventProperties).promise;
      expect(response).toEqual(success);
      expect(dispatch).toHaveBeenCalledTimes(1);
    });
  });

  describe('register', () => {
    test('should call register', async () => {
      const dispatch = jest.spyOn(client, 'dispatch').mockReturnValueOnce(Promise.resolve(success));
      const response = await client.register(DISTINCT_ID);
      expect(response).toEqual(success);
      expect(dispatch).toHaveBeenCalledTimes(1);
    });
  });

  describe('identify', () => {
    test('should call identify', async () => {
      const dispatch = jest.spyOn(client, 'dispatch').mockReturnValueOnce(Promise.resolve(success));
      const identify: Identify = new Identify();
      const response = await client.identify(alias, identify, undefined);
      expect(response).toEqual(success);
      expect(dispatch).toHaveBeenCalledTimes(1);
    });
  });

  describe('alias', () => {
    test('should call alias', async () => {
      const dispatch = jest.spyOn(client, 'dispatch').mockReturnValueOnce(Promise.resolve(success));
      const response = await client.alias(alias, DISTINCT_ID);
      expect(response).toEqual(success);
      expect(dispatch).toHaveBeenCalledTimes(1);
    });
  });

  describe('add/remove', () => {
    test('should call add', async () => {
      const register = jest.spyOn(client.timeline, 'register').mockReturnValueOnce(Promise.resolve());
      const deregister = jest.spyOn(client.timeline, 'deregister').mockReturnValueOnce(Promise.resolve());
      const setup = jest.fn();
      const execute = jest.fn();
      const plugin: Plugin = {
        name: 'plugin',
        type: PluginType.BEFORE,
        setup: setup,
        execute: execute,
      };

      // add
      await client.add(plugin);
      expect(register).toHaveBeenCalledTimes(1);

      // remove
      await client.remove(plugin.name);
      expect(deregister).toHaveBeenCalledTimes(1);
    });

    test('should queue add/remove', async () => {
      const client = new CoxwaveCore();
      const register = jest.spyOn(client.timeline, 'register');
      const deregister = jest.spyOn(client.timeline, 'deregister');
      await client.add({
        name: 'example',
        type: PluginType.BEFORE,
        setup: jest.fn(),
        execute: jest.fn(),
      });
      await client.remove('example');
      await client._init(useDefaultConfig());
      expect(register).toHaveBeenCalledTimes(1);
      expect(deregister).toHaveBeenCalledTimes(1);
    });
  });

  describe('dispatchWithCallback', () => {
    test('should handle success', async () => {
      const push = jest.spyOn(client.timeline, 'push').mockReturnValueOnce(Promise.resolve(success));
      const event: Event = {
        id: 'uuid',
        eventType: AvailableEventType.TRACK,
        eventName: 'eventName',
      };

      return new Promise<void>((resolve) => {
        client.dispatchWithCallback(event, (result) => {
          expect(result).toBe(success);
          expect(push).toHaveBeenCalledTimes(1);
          resolve();
        });
      });
    });

    test('should handle undefined config', async () => {
      const client = new CoxwaveCore();
      const event: Event = {
        id: 'uuid',
        eventType: AvailableEventType.TRACK,
        eventName: 'eventName',
      };

      return new Promise<void>((resolve) => {
        client.dispatchWithCallback(event, (result) => {
          expect(result).toEqual({
            id: 'uuid',
            event,
            code: 0,
            message: CLIENT_NOT_INITIALIZED,
            body: {},
          });
          resolve();
        });
      });
    });
  });

  describe('dispatch', () => {
    test('should handle success', async () => {
      const push = jest.spyOn(client.timeline, 'push').mockReturnValueOnce(Promise.resolve(success));
      const event: Event = {
        id: 'uuid',
        eventType: '$track',
        eventName: 'eventName',
      };

      const result = await client.dispatch(event);
      expect(result).toBe(success);
      expect(push).toHaveBeenCalledTimes(1);
    });

    test('should handle non-200 error', async () => {
      const push = jest.spyOn(client.timeline, 'push').mockReturnValueOnce(Promise.resolve(badRequest));
      const event: Event = {
        id: 'uuid',
        eventType: '$track',
        eventName: 'eventName',
      };

      const result = await client.dispatch(event);
      expect(result).toBe(badRequest);
      expect(push).toHaveBeenCalledTimes(1);
    });

    test('should handle unexpected error', async () => {
      const push = jest.spyOn(client.timeline, 'push').mockImplementation(() => {
        throw new Error();
      });
      const event: Event = {
        id: 'uuid',
        eventType: '$track',
        eventName: 'eventName',
      };

      const result = await client.dispatch(event);
      expect(result).toEqual({
        id: 'uuid',
        event,
        message: 'Error',
        code: 0,
        body: {},
      });
      expect(push).toHaveBeenCalledTimes(1);
    });

    test('should handle opt out', async () => {
      const push = jest.spyOn(client.timeline, 'push').mockReturnValueOnce(Promise.resolve(success));
      const event: Event = {
        id: 'uuid',
        eventType: '$track',
        eventName: 'eventName',
      };

      client.setOptOut(true);
      const result = await client.dispatch(event);
      expect(result).toEqual({
        id: 'uuid',
        event,
        message: OPT_OUT_MESSAGE,
        code: 0,
        body: {},
      });
      expect(push).toHaveBeenCalledTimes(0);
    });

    test('should handle undefined config', async () => {
      const client = new CoxwaveCore();
      const push = jest.spyOn(client.timeline, 'push').mockReturnValueOnce(Promise.resolve(success));
      const event: Event = {
        id: 'uuid',
        eventType: '$track',
        eventName: 'eventName',
      };

      const dispathPromise = client.dispatch(event);
      await client._init(useDefaultConfig());
      await client.runQueuedFunctions('dispatchQ');
      const result = await dispathPromise;
      expect(push).toHaveBeenCalledTimes(1);
      expect(result).toBe(success);
    });
  });

  describe('setOptOut', () => {
    test('should update opt out value', () => {
      client.setOptOut(true);
      expect(client.config.optOut).toBe(true);
    });

    test('should defer update opt out value', async () => {
      const client = new CoxwaveCore();
      client.setOptOut(true);
      await client._init(useDefaultConfig());
      expect(client.config.optOut).toBe(true);
    });
  });

  describe('flush', () => {
    test('should call flush', async () => {
      const flush = jest.spyOn(client.timeline, 'flush').mockReturnValueOnce(Promise.resolve());
      const setup = jest.fn();
      const execute = jest.fn();
      const plugin: Plugin = {
        name: 'plugin',
        type: PluginType.DESTINATION,
        setup: setup,
        execute: execute,
      };

      // add
      await client.add(plugin);
      await client.flush();
      expect(flush).toHaveBeenCalledTimes(1);
    });
  });
});
