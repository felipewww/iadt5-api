import {Exchange} from "./Exchange";
import {Queue} from "./Queue";
import { manifest } from '@/infra/manifest/manifest';

export const DEAD_LETTER_EXC_NAME = `${manifest.uid}_exc-dlx`

export interface IExchangesDefinitions {
    [key: string]: Exchange
}

export interface IQueuesDefinitions {
    [key: string]: Queue
}

export interface IMessageAccountable<MESSAGE_ESTRUCT> {
    exec(): Promise<any>
}

export {Connection} from './Connection'
export {Consumer} from './Consumer'
export {Exchange} from './Exchange'
export {Producer} from './Producer'
export {Queue} from './Queue'
export {EventQueue} from './Queue'
