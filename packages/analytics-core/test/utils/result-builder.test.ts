import { AvailableEventType, Status } from '@coxwave/analytics-types';

import { buildResult } from '../../src/utils/result-builder';

describe('buildResult', () => {
  test('should return success', () => {
    const event = {
      id: 'uuid',
      eventType: AvailableEventType.TRACK,
      eventName: 'hello',
    };
    const result = buildResult(event, 200, Status.Success);
    expect(result.event).toBeDefined();
    expect(result.code).toBe(200);
    expect(result.message).toBe(Status.Success);
  });

  test('should return default values', () => {
    const event = {
      id: 'uuid',
      eventType: AvailableEventType.TRACK,
      eventName: 'hello',
    };
    const result = buildResult(event);
    expect(result.code).toBe(0);
    expect(result.message).toBe(Status.Unknown);
  });
});
