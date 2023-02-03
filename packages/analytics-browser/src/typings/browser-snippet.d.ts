import { InstanceProxy } from '@joowon.kim/analytics-types';

declare global {
  // globalThis only includes `var` declarations
  // eslint-disable-next-line no-var
  var coxwave: InstanceProxy & { invoked: boolean };
}
