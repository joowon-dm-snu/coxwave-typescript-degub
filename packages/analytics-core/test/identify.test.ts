import { Identify } from '../src/index';

describe('Identify class', () => {
  test('should see user property when using set', () => {
    const identify = new Identify();
    identify.set('PROPERTY_NAME', 'PROPERTY_VALUE');
    const properties = identify.getUserProperties();

    const expectedProperties = {
      PROPERTY_NAME: 'PROPERTY_VALUE',
    };

    expect(properties).toStrictEqual(expectedProperties);
  });

  test('should allow multiple properties to be added', () => {
    const identify = new Identify();
    identify.set('PROPERTY_NAME', 'PROPERTY_VALUE');
    identify.set('PROPERTY_NAME_TWO', 1);
    const expectedProperties = {
      PROPERTY_NAME: 'PROPERTY_VALUE',
      PROPERTY_NAME_TWO: 1,
    };

    expect(identify.getUserProperties()).toStrictEqual(expectedProperties);
  });

  test('should not allow non-string property names', () => {
    const identify = new Identify();
    // this should be ignored
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    identify.set(3 as any, 'PROPERTY_VALUE');
    const expectedProperties = {};

    expect(identify.getUserProperties()).toStrictEqual(expectedProperties);
  });

  test('should not set any properties twice', () => {
    const identify = new Identify();
    identify.set('PROPERTY_NAME', 'PROPERTY_VALUE');
    // these two should be ignored
    identify.set('PROPERTY_NAME', 1);
    const expectedProperties = {
      PROPERTY_NAME: 'PROPERTY_VALUE',
    };

    expect(identify.getUserProperties()).toStrictEqual(expectedProperties);
  });

  test('should not allow to set a key to null', () => {
    const identify = new Identify();
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore bypassing ts rules to test unexpected input
    identify.set('PROPERTY_NAME', null);
    const expectedProperties = {};

    expect(identify.getUserProperties()).toStrictEqual(expectedProperties);
  });

  test('should not allow to set a key to undefined', () => {
    const identify = new Identify();
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore bypassing ts rules to test unexpected input
    identify.set('PROPERTY_NAME', undefined);
    const expectedProperties = {};

    expect(identify.getUserProperties()).toStrictEqual(expectedProperties);
  });
});
