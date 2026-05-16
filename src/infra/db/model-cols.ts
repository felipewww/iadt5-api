export type ModelCols<MODEL> = {
    [key in keyof MODEL]: any
}
