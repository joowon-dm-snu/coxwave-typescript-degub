import { BaseEvent } from './events';

export interface Result {
  id: string;
  event: BaseEvent;
  code: number;
  message: string;
  body: Record<string, number | string>;
}
