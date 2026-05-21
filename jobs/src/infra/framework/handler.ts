export interface Handler<I, O> {
    execute(input: I): Promise<O>
}
