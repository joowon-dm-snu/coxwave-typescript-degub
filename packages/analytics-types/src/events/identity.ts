import { BaseEvent, ValidPropertyType } from './base-event';

export const SpecialIdentifyPropertyKey = ['$name', '$email', '$city', '$region', '$country', '$language'] as const;
export type TSpecialIdentifyPropertyKey = (typeof SpecialIdentifyPropertyKey)[number];

export interface IdentifyProperties {
  [key: string]: ValidPropertyType;
}

export interface Identify {
  getUserProperties(): IdentifyProperties;
  set(property: string, value: ValidPropertyType): Identify;
}

// TODO: Only support for SET for now.
export enum IdentifyOperation {
  SET = '$set',
}

export interface IdentifyRegisterProperties {
  distinctId: string;
}

export interface IdentifyRegisterEvent extends BaseEvent, IdentifyRegisterProperties {
  eventType: '$identify';
  eventName: '$register';
}

export interface IdentifyUserProperties {
  alias: string;
}

export interface IdentifyUserEvent extends BaseEvent, IdentifyUserProperties {
  eventType: '$identify';
  eventName: '$identify';
}

export interface IdentifyAliasProperties {
  alias: string;
  distinctId: string;
}

export interface IdentifyAliasEvent extends BaseEvent, IdentifyAliasProperties {
  eventType: '$identify';
  eventName: '$alias';
}
