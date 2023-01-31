import { Event, AvailableEventType, DestinationContext, Status } from '@coxwave/analytics-types';

import { INVALID_PROJECT_TOKEN, MISSING_PROJECT_TOKEN_MESSAGE, UNEXPECTED_ERROR_MESSAGE } from '../../../src/messages';
import { _BaseDestination } from '../../../src/plugins/destinations';
import { PROJECT_TOKEN, useDefaultConfig } from '../../helpers/default';

describe('destination', () => {
  describe('setup', () => {
    test('should setup plugin', async () => {
      const destination = new _BaseDestination();
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
      const destination = new _BaseDestination();
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
      const destination = new _BaseDestination();
      const config = useDefaultConfig();
      config.storageProvider = undefined;
      const execute = jest.spyOn(destination, 'execute');
      await destination.setup(config);
      expect(execute).toHaveBeenCalledTimes(0);
    });
  });

  describe('execute', () => {
    test('should execute plugin', async () => {
      const destination = new _BaseDestination();
      const event = {
        id: 'uuid',
        eventType: AvailableEventType.TRACK,
        eventName: 'eventName',
      };
      const addToQueue = jest.spyOn(destination, 'addToQueue').mockImplementation((context: DestinationContext) => {
        context.callback({ id: 'uuid', event, code: 200, message: Status.Success, body: {} });
      });
      await destination.execute(event);
      expect(addToQueue).toHaveBeenCalledTimes(1);
    });
  });

  describe('addToQueue', () => {
    test('should add to queue and schedule a flush', () => {
      const destination = new _BaseDestination();
      destination.config = {
        ...useDefaultConfig(),
        flushIntervalMillis: 0,
      };
      const schedule = jest.spyOn(destination, 'schedule').mockReturnValueOnce(undefined);
      const event = {
        id: 'uuid',
        eventType: AvailableEventType.TRACK,
        eventName: 'eventName',
      };
      const context = {
        event,
        callback: () => undefined,
        attempts: 0,
        timeout: 0,
      };
      destination.addToQueue(context);
      expect(schedule).toHaveBeenCalledTimes(1);
      expect(context.attempts).toBe(1);
    });
  });

  describe('schedule', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      jest.useRealTimers();
    });

    test('should schedule a flush', async () => {
      const destination = new _BaseDestination();
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      (destination as any).scheduled = null;
      destination.queue = [
        {
          event: {
            id: 'uuid',
            eventType: AvailableEventType.TRACK,
            eventName: 'eventName',
          },
          attempts: 0,
          callback: () => undefined,
          timeout: 0,
        },
      ];
      const flush = jest
        .spyOn(destination, 'flush')
        .mockImplementationOnce(() => {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          (destination as any).scheduled = null;
          return Promise.resolve(undefined);
        })
        .mockReturnValueOnce(Promise.resolve(undefined));
      destination.schedule(0);
      // exhause first setTimeout
      jest.runAllTimers();
      // wait for next tick to call nested setTimeout
      await Promise.resolve();
      // exhause nested setTimeout
      jest.runAllTimers();
      expect(flush).toHaveBeenCalledTimes(2);
    });

    test('should not schedule if one is already in progress', () => {
      const destination = new _BaseDestination();
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      (destination as any).scheduled = setTimeout(jest.fn, 0);
      const flush = jest.spyOn(destination, 'flush').mockReturnValueOnce(Promise.resolve(undefined));
      destination.schedule(0);
      expect(flush).toHaveBeenCalledTimes(0);
    });
  });

  describe('flush', () => {
    test('should get batch and call send', async () => {
      const destination = new _BaseDestination();
      destination.config = {
        ...useDefaultConfig(),
        flushQueueSize: 1,
      };
      destination.queue = [
        {
          event: {
            id: 'uuid',
            eventType: AvailableEventType.TRACK,
            eventName: 'eventName',
          },
          attempts: 0,
          callback: () => undefined,
          timeout: 0,
        },
      ];
      const send = jest.spyOn(destination, 'send').mockReturnValueOnce(Promise.resolve());
      const result = await destination.flush();
      expect(destination.queue).toEqual([]);
      expect(result).toBe(undefined);
      expect(send).toHaveBeenCalledTimes(1);
    });

    test('should send with queue', async () => {
      const destination = new _BaseDestination();
      destination.config = {
        ...useDefaultConfig(),
      };
      destination.queue = [
        {
          event: {
            id: 'uuid',
            eventType: AvailableEventType.TRACK,
            eventName: 'eventName',
          },
          attempts: 0,
          callback: () => undefined,
          timeout: 0,
        },
      ];
      const send = jest.spyOn(destination, 'send').mockReturnValueOnce(Promise.resolve());
      const result = await destination.flush();
      expect(destination.queue).toEqual([]);
      expect(result).toBe(undefined);
      expect(send).toHaveBeenCalledTimes(1);
    });

    test('should send later', async () => {
      const destination = new _BaseDestination();
      destination.config = {
        ...useDefaultConfig(),
      };
      destination.queue = [
        {
          event: {
            id: 'uuid',
            eventType: AvailableEventType.TRACK,
            eventName: 'eventName',
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
            eventType: '$track',
            eventName: 'eventName',
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

  describe('send', () => {
    test('should not retry', async () => {
      const destination = new _BaseDestination();
      const callback = jest.fn();
      const _createPayload = jest.fn();
      const _createEndpointUrl = jest.fn();
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
      destination._createPayload = _createPayload;
      destination._createEndpointUrl = _createEndpointUrl;
      await destination.send([context], false);
      expect(callback).toHaveBeenCalledTimes(1);
      expect(callback).toHaveBeenCalledWith({
        id: 'uuid',
        event,
        code: 500,
        message: Status.Failed,
        body: {},
      });
      expect(_createPayload).toHaveBeenCalledTimes(1);
      expect(_createEndpointUrl).toHaveBeenCalledTimes(1);
    });

    test('should provide error details', async () => {
      const destination = new _BaseDestination();
      const callback = jest.fn();
      const _createPayload = jest.fn();
      const _createEndpointUrl = jest.fn();
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
      destination._createPayload = _createPayload;
      destination._createEndpointUrl = _createEndpointUrl;
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
      const destination = new _BaseDestination();
      const callback = jest.fn();
      const _createPayload = jest.fn();
      const _createEndpointUrl = jest.fn();
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
      destination._createPayload = _createPayload;
      destination._createEndpointUrl = _createEndpointUrl;
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
      const destination = new _BaseDestination();
      const callback = jest.fn();
      const _createPayload = jest.fn();
      const _createEndpointUrl = jest.fn();
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
      destination._createPayload = _createPayload;
      destination._createEndpointUrl = _createEndpointUrl;
      await destination.send([context]);
      expect(callback).toHaveBeenCalledTimes(1);
    });
  });

  describe('saveEvents', () => {
    test('should save to storage provider', () => {
      const destination = new _BaseDestination();
      destination.config = useDefaultConfig();
      destination.config.storageProvider = {
        isEnabled: async () => true,
        get: async () => undefined,
        set: async () => undefined,
        remove: async () => undefined,
        reset: async () => undefined,
        getRaw: async () => undefined,
      };
      const set = jest.spyOn(destination.config.storageProvider, 'set').mockResolvedValueOnce(undefined);
      destination.saveEvents();
      expect(set).toHaveBeenCalledTimes(1);
    });

    test('should be ok with no storage provider', () => {
      const destination = new _BaseDestination();
      destination.config = useDefaultConfig();
      destination.config.storageProvider = undefined;
      expect(destination.saveEvents()).toBe(undefined);
    });
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
      const destination = new _BaseDestination();
      const _createPayload = jest.fn();
      const _createEndpointUrl = jest.fn();
      const config = {
        ...useDefaultConfig(),
        flushQueueSize: 2,
        flushIntervalMillis: 500,
        transportProvider,
      };
      await destination.setup(config);
      destination._createPayload = _createPayload;
      destination._createEndpointUrl = _createEndpointUrl;
      const result = await destination.execute({
        id: 'uuid',
        eventType: AvailableEventType.TRACK,
        eventName: 'eventName',
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
      const destination = new _BaseDestination();
      const _createPayload = jest.fn();
      const _createEndpointUrl = jest.fn();
      destination.retryTimeout = 10;
      const config = {
        ...useDefaultConfig(),
        flushQueueSize: 2,
        flushIntervalMillis: 500,
        transportProvider,
      };
      await destination.setup(config);
      destination._createPayload = _createPayload;
      destination._createEndpointUrl = _createEndpointUrl;
      const results = await Promise.all([
        destination.execute({
          id: 'uuid',
          eventType: AvailableEventType.TRACK,
          eventName: 'eventName',
        }),
        destination.execute({
          id: 'uuid',
          eventType: AvailableEventType.TRACK,
          eventName: 'eventName',
        }),
      ]);
      expect(results[0].code).toBe(400);
      expect(transportProvider.send).toHaveBeenCalledTimes(1);
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
      const destination = new _BaseDestination();
      const _createPayload = jest.fn();
      const _createEndpointUrl = jest.fn();
      destination.retryTimeout = 10;
      const config = {
        ...useDefaultConfig(),
        flushQueueSize: 2,
        flushIntervalMillis: 500,
        transportProvider,
      };
      await destination.setup(config);
      destination._createPayload = _createPayload;
      destination._createEndpointUrl = _createEndpointUrl;
      const results = await Promise.all([
        destination.execute({
          id: 'uuid',
          eventType: AvailableEventType.TRACK,
          eventName: 'eventName',
        }),
        destination.execute({
          id: 'uuid',
          eventType: AvailableEventType.TRACK,
          eventName: 'eventName',
        }),
      ]);
      expect(results[0].code).toBe(400);
      expect(results[1].code).toBe(200);
      expect(transportProvider.send).toHaveBeenCalledTimes(2);
    });

    test('should handle retry for 400 error with missing body field', async () => {
      class Http {
        send = jest.fn().mockImplementationOnce(() => {
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
      const destination = new _BaseDestination();
      const _createPayload = jest.fn();
      const _createEndpointUrl = jest.fn();
      const config = {
        ...useDefaultConfig(),
        flushQueueSize: 2,
        flushIntervalMillis: 500,
        transportProvider,
      };
      await destination.setup(config);
      destination._createPayload = _createPayload;
      destination._createEndpointUrl = _createEndpointUrl;
      const results = await Promise.all([
        destination.execute({
          id: 'uuid',
          eventType: AvailableEventType.TRACK,
          eventName: 'eventName',
        }),
        destination.execute({
          id: 'uuid',
          eventType: AvailableEventType.TRACK,
          eventName: 'eventName',
        }),
      ]);
      expect(results[0].code).toBe(400);
      expect(results[1].code).toBe(400);
      expect(transportProvider.send).toHaveBeenCalledTimes(1);
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
      const destination = new _BaseDestination();
      const _createPayload = jest.fn();
      const _createEndpointUrl = jest.fn();
      const config = {
        ...useDefaultConfig(),
        flushQueueSize: 1,
        flushIntervalMillis: 500,
        transportProvider,
      };
      await destination.setup(config);
      destination._createPayload = _createPayload;
      destination._createEndpointUrl = _createEndpointUrl;
      const event = {
        id: 'uuid',
        eventType: AvailableEventType.TRACK,
        eventName: 'eventName',
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

    test('should handle retry for 413 error', async () => {
      class Http {
        send = jest
          .fn()
          .mockImplementationOnce(() => {
            return Promise.resolve({
              status: Status.PayloadTooLarge,
              statusCode: 413,
              body: {
                error: 'error',
              },
            });
          })
          .mockImplementationOnce(() => {
            return Promise.resolve(successResponse);
          })
          .mockImplementationOnce(() => {
            return Promise.resolve(successResponse);
          });
      }
      const transportProvider = new Http();
      const destination = new _BaseDestination();
      const _createPayload = jest.fn();
      const _createEndpointUrl = jest.fn();
      destination.retryTimeout = 10;
      const config = {
        ...useDefaultConfig(),
        flushQueueSize: 2,
        flushIntervalMillis: 500,
        transportProvider,
      };
      await destination.setup(config);
      destination._createPayload = _createPayload;
      destination._createEndpointUrl = _createEndpointUrl;
      await Promise.all([
        destination.execute({
          id: 'uuid',
          eventType: AvailableEventType.TRACK,
          eventName: 'eventName',
        }),
        destination.execute({
          id: 'uuid',
          eventType: AvailableEventType.TRACK,
          eventName: 'eventName',
        }),
      ]);
      expect(transportProvider.send).toHaveBeenCalledTimes(3);
    });

    test('should handle retry for 429 error', async () => {
      class Http {
        send = jest
          .fn()
          .mockImplementationOnce(() => {
            return Promise.resolve({
              status: Status.RateLimit,
              statusCode: 429,
              body: {
                error: 'error',
                epsThreshold: 1,
                throttledDevices: {},
                throttledUsers: {},
                exceededDailyQuotaDevices: {
                  '1': 1,
                },
                exceededDailyQuotaUsers: {
                  '2': 1,
                },
                throttledEvents: [0],
              },
            });
          })
          .mockImplementationOnce(() => {
            return Promise.resolve(successResponse);
          })
          .mockImplementationOnce(() => {
            return Promise.resolve(successResponse);
          });
      }
      const transportProvider = new Http();
      const destination = new _BaseDestination();
      const _createPayload = jest.fn();
      const _createEndpointUrl = jest.fn();
      destination.retryTimeout = 10;
      destination.throttleTimeout = 1;
      const config = {
        ...useDefaultConfig(),
        flushQueueSize: 4,
        flushIntervalMillis: 500,
        transportProvider,
      };
      await destination.setup(config);
      destination._createPayload = _createPayload;
      destination._createEndpointUrl = _createEndpointUrl;
      const results = await Promise.all([
        // throttled
        destination.execute({
          id: 'uuid',
          eventType: AvailableEventType.TRACK,
          eventName: 'eventName',
          properties: {
            $distinctId: '0',
            $deviceId: '0',
          },
        }),
        // exceed daily device quota
        destination.execute({
          id: 'uuid',
          eventType: AvailableEventType.TRACK,
          eventName: 'eventName',
          properties: {
            $distinctId: '1',
            $deviceId: '1',
          },
        }),
        // exceed daily user quota
        destination.execute({
          id: 'uuid',
          eventType: AvailableEventType.TRACK,
          eventName: 'eventName',
          properties: {
            $distinctId: '2',
            $deviceId: '2',
          },
        }),
        // success
        destination.execute({
          id: 'uuid',
          eventType: AvailableEventType.TRACK,
          eventName: 'eventName',
          properties: {
            $distinctId: '3',
            $deviceId: '3',
          },
        }),
      ]);
      expect(results[0].code).toBe(200);
      expect(results[1].code).toBe(429);
      expect(results[2].code).toBe(429);
      expect(results[3].code).toBe(200);
      expect(transportProvider.send).toHaveBeenCalledTimes(2);
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
      const destination = new _BaseDestination();
      const _createPayload = jest.fn();
      const _createEndpointUrl = jest.fn();
      destination.retryTimeout = 10;
      const config = {
        ...useDefaultConfig(),
        flushQueueSize: 2,
        flushIntervalMillis: 500,
        transportProvider,
      };
      await destination.setup(config);
      destination._createPayload = _createPayload;
      destination._createEndpointUrl = _createEndpointUrl;
      await Promise.all([
        destination.execute({
          id: 'uuid',
          eventType: AvailableEventType.TRACK,
          eventName: 'eventName',
        }),
        destination.execute({
          id: 'uuid',
          eventType: AvailableEventType.TRACK,
          eventName: 'eventName',
        }),
      ]);
      expect(transportProvider.send).toHaveBeenCalledTimes(2);
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
      const destination = new _BaseDestination();
      const _createPayload = jest.fn();
      const _createEndpointUrl = jest.fn();
      destination.retryTimeout = 10;
      const config = {
        ...useDefaultConfig(),
        flushMaxRetries: 1,
        flushQueueSize: 2,
        flushIntervalMillis: 500,
        transportProvider,
      };
      await destination.setup(config);
      destination._createPayload = _createPayload;
      destination._createEndpointUrl = _createEndpointUrl;
      const results = await Promise.all([
        destination.execute({
          id: 'uuid',
          eventType: AvailableEventType.TRACK,
          eventName: 'eventName',
        }),
        destination.execute({
          id: 'uuid',
          eventType: AvailableEventType.TRACK,
          eventName: 'eventName',
        }),
      ]);
      expect(results[0].code).toBe(500);
      expect(results[1].code).toBe(500);
      expect(transportProvider.send).toHaveBeenCalledTimes(1);
    });
  });
});
