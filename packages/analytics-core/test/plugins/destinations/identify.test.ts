import { Event, AvailableEventType, Status, SpecialEventName, DestinationContext } from '@joowon.kim/analytics-types';

import {
  SERVER_IDENTIFY_REGISTER_PATH,
  SERVER_IDENTIFY_IDENTIFY_PATH,
  SERVER_IDENTIFY_ALIAS_PATH,
} from '../../../src/constants';
import { INVALID_PROJECT_TOKEN, MISSING_PROJECT_TOKEN_MESSAGE, UNEXPECTED_ERROR_MESSAGE } from '../../../src/messages';
import { IdentifyDestination } from '../../../src/plugins/destinations';
import { ALIAS_NAME, DISTINCT_ID, PROJECT_TOKEN, useDefaultConfig } from '../../helpers/default';

// TODO: this tests have some duplicated cases.
describe('IdentifyDestination', () => {
  describe('setup', () => {
    test('should setup plugin', async () => {
      const destination = new IdentifyDestination();
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
      const destination = new IdentifyDestination();
      const config = useDefaultConfig();
      const event: Event = {
        id: 'uuid',
        eventType: AvailableEventType.IDENTIFY,
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
      const destination = new IdentifyDestination();
      const config = useDefaultConfig();
      config.storageProvider = undefined;
      const execute = jest.spyOn(destination, 'execute');
      await destination.setup(config);
      expect(execute).toHaveBeenCalledTimes(0);
    });
  });

  describe('execute', () => {
    test('should execute plugin for IdentifyRegister', async () => {
      const destination = new IdentifyDestination();
      const event = {
        id: 'uuid',
        distinctId: DISTINCT_ID,
        eventType: AvailableEventType.IDENTIFY,
        eventName: SpecialEventName.REGISTER,
      };
      const addToQueue = jest.spyOn(destination, 'addToQueue').mockImplementation((context: DestinationContext) => {
        context.callback({ id: 'uuid', event, code: 200, message: Status.Success, body: {} });
      });
      await destination.execute(event);
      expect(addToQueue).toHaveBeenCalledTimes(1);
    });

    test('should execute plugin for IdentifyUser', async () => {
      const destination = new IdentifyDestination();
      const event = {
        id: 'uuid',
        alias: ALIAS_NAME,
        eventType: AvailableEventType.IDENTIFY,
        eventName: SpecialEventName.IDENTIFY,
      };
      const addToQueue = jest.spyOn(destination, 'addToQueue').mockImplementation((context: DestinationContext) => {
        context.callback({ id: 'uuid', event, code: 200, message: Status.Success, body: {} });
      });
      await destination.execute(event);
      expect(addToQueue).toHaveBeenCalledTimes(1);
    });

    test('should execute plugin for IdentifyAlias', async () => {
      const destination = new IdentifyDestination();
      const event = {
        id: 'uuid',
        alias: ALIAS_NAME,
        distinctId: DISTINCT_ID,
        eventType: AvailableEventType.IDENTIFY,
        eventName: SpecialEventName.ALIAS,
      };
      const addToQueue = jest.spyOn(destination, 'addToQueue').mockImplementation((context: DestinationContext) => {
        context.callback({ id: 'uuid', event, code: 200, message: Status.Success, body: {} });
      });
      await destination.execute(event);
      expect(addToQueue).toHaveBeenCalledTimes(1);
    });
  });

  describe('flush', () => {
    test('should send later', async () => {
      const destination = new IdentifyDestination();
      destination.config = {
        ...useDefaultConfig(),
      };
      destination.queue = [
        {
          event: {
            id: 'uuid',
            alias: ALIAS_NAME,
            eventType: AvailableEventType.IDENTIFY,
            eventName: SpecialEventName.IDENTIFY,
          },
          attempts: 0,
          callback: () => undefined,
          timeout: 1000,
        },
      ];
      const send = jest.spyOn(destination, 'send').mockReturnValueOnce(Promise.resolve());
      const result = await destination.flush();
      expect(destination.queue).toEqual([
        {
          event: {
            id: 'uuid',
            alias: ALIAS_NAME,
            eventType: AvailableEventType.IDENTIFY,
            eventName: SpecialEventName.IDENTIFY,
          },
          attempts: 0,
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          callback: expect.any(Function),
          timeout: 1000,
        },
      ]);
      expect(result).toBe(undefined);
      expect(send).toHaveBeenCalledTimes(0);
    });
  });

  describe('_createEndpointUrl', () => {
    test('should create IdentifyRegister endpoint', () => {
      const destination = new IdentifyDestination();
      const endpoint = destination._createEndpointUrl('', '$register');
      expect(endpoint).toEqual(SERVER_IDENTIFY_REGISTER_PATH);
    });

    test('should create IdentifyUser endpoint', () => {
      const destination = new IdentifyDestination();
      const endpoint = destination._createEndpointUrl('', '$identify');
      expect(endpoint).toEqual(SERVER_IDENTIFY_IDENTIFY_PATH);
    });

    test('should create IdentifyAlias endpoint', () => {
      const destination = new IdentifyDestination();
      const endpoint = destination._createEndpointUrl('', '$alias');
      expect(endpoint).toEqual(SERVER_IDENTIFY_ALIAS_PATH);
    });

    test('should throw error for wrong event name', () => {
      const destination = new IdentifyDestination();
      const eventName = 'wrong';
      expect(() => destination._createEndpointUrl('', eventName)).toThrow(`Unknown event name: ${eventName}`);
    });
  });

  describe('sendIdentify', () => {
    test('should not retry', async () => {
      const destination = new IdentifyDestination();
      const callback = jest.fn();
      const event = {
        id: 'uuid',
        eventType: AvailableEventType.IDENTIFY,
        eventName: SpecialEventName.IDENTIFY,
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
      await destination.sendIdentify(context, false);
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
      const destination = new IdentifyDestination();
      const callback = jest.fn();
      const event = {
        id: 'uuid',
        eventType: AvailableEventType.IDENTIFY,
        eventName: SpecialEventName.IDENTIFY,
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

      await destination.sendIdentify(context, false);
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
      const destination = new IdentifyDestination();
      const callback = jest.fn();
      const event = {
        id: 'uuid',
        eventType: AvailableEventType.IDENTIFY,
        eventName: SpecialEventName.IDENTIFY,
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

      await destination.sendIdentify(context);
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
      const destination = new IdentifyDestination();
      const callback = jest.fn();
      const context = {
        attempts: 0,
        callback,
        event: {
          id: 'uuid',
          alias: ALIAS_NAME,
          eventType: AvailableEventType.IDENTIFY,
          eventName: SpecialEventName.IDENTIFY,
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

      await destination.sendIdentify(context);
      expect(callback).toHaveBeenCalledTimes(1);
    });

    describe('module level integration', () => {
      const successResponse = {
        status: Status.Success,
        statusCode: 200,
        body: {
          eventsIngested: 1,
          payloadSizeBytes: 1,
          serverUploadTime: 1,
        },
      };

      test('should handle unexpected error', async () => {
        class Http {
          send = jest.fn().mockImplementationOnce(() => {
            return Promise.resolve(null);
          });
        }
        const transportProvider = new Http();
        const destination = new IdentifyDestination();
        const config = {
          ...useDefaultConfig(),
          flushQueueSize: 2,
          flushIntervalMillis: 500,
          transportProvider,
        };
        await destination.setup(config);
        const result = await destination.execute({
          id: 'uuid',
          alias: ALIAS_NAME,
          eventType: AvailableEventType.IDENTIFY,
          eventName: SpecialEventName.IDENTIFY,
        });
        expect(result.code).toBe(0);
        expect(result.message).toBe(UNEXPECTED_ERROR_MESSAGE);
        expect(transportProvider.send).toHaveBeenCalledTimes(1);
      });

      test('should not retry with invalid api key', async () => {
        class Http {
          send = jest.fn().mockImplementationOnce(() => {
            return Promise.resolve({
              status: Status.Invalid,
              statusCode: 400,
              body: {
                error: INVALID_PROJECT_TOKEN,
              },
            });
          });
        }
        const transportProvider = new Http();
        const destination = new IdentifyDestination();
        destination.retryTimeout = 10;
        const config = {
          ...useDefaultConfig(),
          flushQueueSize: 2,
          flushIntervalMillis: 500,
          transportProvider,
        };
        await destination.setup(config);
        const results = await Promise.all([
          destination.execute({
            id: 'uuid',
            alias: ALIAS_NAME,
            eventType: AvailableEventType.IDENTIFY,
            eventName: SpecialEventName.IDENTIFY,
          }),
          destination.execute({
            id: 'uuid',
            alias: ALIAS_NAME,
            eventType: AvailableEventType.IDENTIFY,
            eventName: SpecialEventName.IDENTIFY,
          }),
        ]);
        expect(results[0].code).toBe(400);
        expect(transportProvider.send).toHaveBeenCalledTimes(2);
      });

      test('should handle retry for 400 error', async () => {
        class Http {
          send = jest
            .fn()
            .mockImplementationOnce(() => {
              return Promise.resolve({
                status: Status.Invalid,
                statusCode: 400,
                body: {
                  error: 'error',
                  missingField: '',
                  eventsWithInvalidFields: { a: [0] },
                  eventsWithMissingFields: { b: [] },
                  eventsWithInvalidIdLengths: {},
                  silencedEvents: [],
                },
              });
            })
            .mockImplementationOnce(() => {
              return Promise.resolve(successResponse);
            });
        }
        const transportProvider = new Http();
        const destination = new IdentifyDestination();
        destination.retryTimeout = 10;
        const config = {
          ...useDefaultConfig(),
          flushQueueSize: 2,
          flushIntervalMillis: 500,
          transportProvider,
        };
        await destination.setup(config);
        const results = await Promise.all([
          destination.execute({
            id: 'uuid',
            alias: ALIAS_NAME,
            eventType: AvailableEventType.IDENTIFY,
            eventName: SpecialEventName.IDENTIFY,
          }),
          destination.execute({
            id: 'uuid',
            alias: ALIAS_NAME,
            eventType: AvailableEventType.IDENTIFY,
            eventName: SpecialEventName.IDENTIFY,
          }),
        ]);
        expect(results[0].code).toBe(400);
        expect(results[1].code).toBe(200);
        expect(transportProvider.send).toHaveBeenCalledTimes(2);
      });

      test('should handle retry for 400 error with missing body field', async () => {
        class Http {
          send = jest.fn().mockImplementation(() => {
            return Promise.resolve({
              status: Status.Invalid,
              statusCode: 400,
              body: {
                error: 'error',
                missingField: 'key',
                eventsWithInvalidFields: {},
                eventsWithMissingFields: {},
                silencedEvents: [],
              },
            });
          });
        }
        const transportProvider = new Http();
        const destination = new IdentifyDestination();
        const config = {
          ...useDefaultConfig(),
          flushQueueSize: 2,
          flushIntervalMillis: 500,
          transportProvider,
        };
        await destination.setup(config);
        const results = await Promise.all([
          destination.execute({
            id: 'uuid',
            alias: ALIAS_NAME,
            eventType: AvailableEventType.IDENTIFY,
            eventName: SpecialEventName.IDENTIFY,
          }),
          destination.execute({
            id: 'uuid',
            alias: ALIAS_NAME,
            eventType: AvailableEventType.IDENTIFY,
            eventName: SpecialEventName.IDENTIFY,
          }),
        ]);
        expect(results[0].code).toBe(400);
        expect(results[1].code).toBe(400);
        expect(transportProvider.send).toHaveBeenCalledTimes(2);
      });

      test('should handle retry for 413 error with flushQueueSize of 1', async () => {
        class Http {
          send = jest.fn().mockImplementationOnce(() => {
            return Promise.resolve({
              status: Status.PayloadTooLarge,
              statusCode: 413,
              body: {
                error: 'error',
              },
            });
          });
        }
        const transportProvider = new Http();
        const destination = new IdentifyDestination();
        const config = {
          ...useDefaultConfig(),
          flushQueueSize: 1,
          flushIntervalMillis: 500,
          transportProvider,
        };
        await destination.setup(config);
        const event = {
          id: 'uuid',
          alias: ALIAS_NAME,
          eventType: AvailableEventType.IDENTIFY,
          eventName: SpecialEventName.IDENTIFY,
        };
        const result = await destination.execute(event);
        expect(result).toEqual({
          id: 'uuid',
          event,
          message: 'error',
          code: 413,
          body: {},
        });
        expect(transportProvider.send).toHaveBeenCalledTimes(1);
      });

      test('should handle retry for 500 error', async () => {
        class Http {
          send = jest
            .fn()
            .mockImplementationOnce(() => {
              return Promise.resolve({
                statusCode: 500,
                status: Status.Failed,
              });
            })
            .mockImplementationOnce(() => {
              return Promise.resolve(successResponse);
            });
        }
        const transportProvider = new Http();
        const destination = new IdentifyDestination();
        destination.retryTimeout = 10;
        const config = {
          ...useDefaultConfig(),
          flushQueueSize: 2,
          flushIntervalMillis: 500,
          transportProvider,
        };
        await destination.setup(config);
        await Promise.all([
          destination.execute({
            id: 'uuid',
            alias: ALIAS_NAME,
            eventType: AvailableEventType.IDENTIFY,
            eventName: SpecialEventName.IDENTIFY,
          }),
          destination.execute({
            id: 'uuid',
            alias: ALIAS_NAME,
            eventType: AvailableEventType.IDENTIFY,
            eventName: SpecialEventName.IDENTIFY,
          }),
        ]);
        expect(transportProvider.send).toHaveBeenCalledTimes(3);
      });

      test('should handle retry for 503 error', async () => {
        class Http {
          send = jest
            .fn()
            .mockImplementationOnce(() => {
              return Promise.resolve({
                statusCode: 500,
                status: Status.Failed,
              });
            })
            .mockImplementationOnce(() => {
              return Promise.resolve({
                statusCode: 500,
                status: Status.Failed,
              });
            });
        }
        const transportProvider = new Http();
        const destination = new IdentifyDestination();
        destination.retryTimeout = 10;
        const config = {
          ...useDefaultConfig(),
          flushMaxRetries: 1,
          flushQueueSize: 2,
          flushIntervalMillis: 500,
          transportProvider,
        };
        await destination.setup(config);
        const results = await Promise.all([
          destination.execute({
            id: 'uuid',
            alias: ALIAS_NAME,
            eventType: AvailableEventType.IDENTIFY,
            eventName: SpecialEventName.IDENTIFY,
          }),
          destination.execute({
            id: 'uuid',
            alias: ALIAS_NAME,
            eventType: AvailableEventType.IDENTIFY,
            eventName: SpecialEventName.IDENTIFY,
          }),
        ]);
        expect(results[0].code).toBe(500);
        expect(results[1].code).toBe(500);
        expect(transportProvider.send).toHaveBeenCalledTimes(2);
      });
    });
  });
});
