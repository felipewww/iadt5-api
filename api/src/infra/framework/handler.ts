// export abstract class Handler<I, O> {
//     abstract execute(input: I, ctx: RequestContext): Promise<O>
// }

import { RequestContext } from '@/infra/framework/context/request-context';

export interface Handler<I, O> {
    execute(input: I, ctx: RequestContext): Promise<O>
}
