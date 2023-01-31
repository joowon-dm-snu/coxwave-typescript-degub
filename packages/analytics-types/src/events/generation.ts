import { BaseEvent } from './base-event';

export const MediaType = {
  TEXT: 'text',
} as const;
export type TMediaType = (typeof MediaType)[keyof typeof MediaType];

export const SpecialGenerationPropertyKey = ['modelId', 'input', 'output'] as const;
export type TSpecialGenerationPropertyKey = (typeof SpecialGenerationPropertyKey)[number];

export interface GenerationIOEntity {
  type: TMediaType;
  value: number | string | Array<string | number>;
}

export interface GenerationProperties extends Record<string, any> {
  modelId?: string;
  input?: {
    [key: string]: GenerationIOEntity | number | string | boolean;
  };
  output?: {
    [key: string]: GenerationIOEntity | number | string | boolean;
  };
}

export interface GenerationEvent extends BaseEvent, GenerationProperties {}
