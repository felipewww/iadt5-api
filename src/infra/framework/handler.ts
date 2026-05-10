// export abstract class Handler<I, O> {
//     abstract execute(input: I): Promise<O>
// }

export interface Handler<I, O> {
    execute(input: I): Promise<O>
}
