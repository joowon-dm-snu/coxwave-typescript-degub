import { Event, AvailableEventType, Status } from '@joowon.kim/analytics-types';

import { MISSING_PROJECT_TOKEN_MESSAGE } from '../../../src/messages';
import { GenerationDestination } from '../../../src/plugins/destinations';
import { PROJECT_TOKEN, useDefaultConfig } from '../../helpers/default';

describe('GenerationDestination', () => {
  describe('setup', () => {
    test('should setup plugin', async () => {
      const destination = new GenerationDestination();
      const config = useDefaultConfig();
      config.serverUrl = 'url';
      config.flushMaxRetries = 0;
      config.flushQueueSize = 0;
      config.flushIntervalMillis = 0;
      await destination.setup(config);
      expect(destination.config.transportProvider).toBeDefined();
      expect(destination.config.serverUrl).toBe('url');
      expect(destination.config.flushMaxRetries).toBe(0);
      expect(destination.config.flushQueueSize).toBe(0);
      expect(destination.config.flushIntervalMillis).toBe(0);
    });

    test('should read from storage', async () => {
      const destination = new GenerationDestination();
      const config = useDefaultConfig();
      const event: Event = {
        id: 'uuid',
        eventType: AvailableEventType.TRACK,
        eventName: 'hello',
      };
      config.storageProvider = {
        isEnabled: async () => true,
        get: async () => undefined,
        set: async () => undefined,
        remove: async () => undefined,
        reset: async () => undefined,
        getRaw: async () => undefined,
      };
      const get = jest.spyOn(config.storageProvider, 'get').mockResolvedValueOnce([event]);
      const execute = jest.spyOn(destination, 'execute').mockReturnValueOnce(
        Promise.resolve({
          id: 'uuid',
          event,
          message: Status.Success,
          code: 200,
          body: {},
        }),
      );
      await destination.setup(config);
      expect(get).toHaveBeenCalledTimes(1);
      expect(execute).toHaveBeenCalledTimes(1);
    });

    test('should be ok with undefined storage', async () => {
      const destination = new GenerationDestination();
      const config = useDefaultConfig();
      config.storageProvider = undefined;
      const execute = jest.spyOn(destination, 'execute');
      await destination.setup(config);
      expect(execute).toHaveBeenCalledTimes(0);
    });
  });

  describe('send', () => {
    test('should not retry', async () => {
      const destination = new GenerationDestination();
      const callback = jest.fn();
      const event = {
        id: 'uuid',
        eventType: AvailableEventType.TRACK,
        eventName: 'eventName',
      };
      const context = {
        attempts: 0,
        callback,
        event,
        timeout: 0,
      };
      const transportProvider = {
        send: jest.fn().mockImplementationOnce(() => {
          return Promise.resolve({
            status: Status.Failed,
            statusCode: 500,
          });
        }),
      };
      await destination.setup({
        ...useDefaultConfig(),
        transportProvider,
        projectToken: PROJECT_TOKEN,
      });
      await destination.send([context], false);
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith({
        id: 'uuid',
        event,
        code: 500,
        message: Status.Failed,
        body: {},
      });
    });

    test('should provide error details', async () => {
      const destination = new GenerationDestination();
      const callback = jest.fn();
      const event = {
        id: 'uuid',
        eventType: AvailableEventType.TRACK,
        eventName: 'eventName',
      };
      const context = {
        attempts: 0,
        callback,
        event,
        timeout: 0,
      };
      const body = {
        error: 'Request missing required field',
        missingField: 'userId',
      };
      const transportProvider = {
        send: jest.fn().mockImplementationOnce(() => {
          return Promise.resolve({
            status: Status.Invalid,
            statusCode: 400,
            body,
          });
        }),
      };
      await destination.setup({
        ...useDefaultConfig(),
        transportProvider,
        projectToken: PROJECT_TOKEN,
      });

      await destination.send([context], false);
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith({
        id: 'uuid',
        event,
        code: 400,
        message: `${Status.Invalid}: ${JSON.stringify(body, null, 2)}`,
        body: {},
      });
    });

    test('should handle no projectToken', async () => {
      const destination = new GenerationDestination();
      const callback = jest.fn();
      const event = {
        id: 'uuid',
        eventType: AvailableEventType.TRACK,
        eventName: 'eventName',
      };
      const context = {
        attempts: 0,
        callback,
        event,
        timeout: 0,
      };
      const transportProvider = {
        send: jest.fn().mockImplementationOnce(() => {
          throw new Error();
        }),
      };
      await destination.setup({
        ...useDefaultConfig(),
        transportProvider,
        projectToken: '',
      });

      await destination.send([context]);
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith({
        id: 'uuid',
        event,
        code: 400,
        message: MISSING_PROJECT_TOKEN_MESSAGE,
        body: {},
      });
    });

    test('should handle unexpected error', async () => {
      const destination = new GenerationDestination();
      const callback = jest.fn();
      const context = {
        attempts: 0,
        callback,
        event: {
          id: 'uuid',
          eventType: AvailableEventType.TRACK,
          eventName: 'eventName',
        },
        timeout: 0,
      };
      const transportProvider = {
        send: jest.fn().mockImplementationOnce(() => {
          throw new Error();
        }),
      };
      await destination.setup({
        ...useDefaultConfig(),
        transportProvider,
      });

      await destination.send([context]);
      expect(callback).toHaveBeenCalledTimes(1);
    });
  });
});
