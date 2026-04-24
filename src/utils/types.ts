export type WithRelation<T, R extends string, RType> = T & {[key in R]:RType}
export type WithRelations<T, R extends object> = T & R
export type WithRequired<T, K extends keyof T> = T & { [P in K]-?: T[P] }
export type OmitRequire<T, O extends keyof T = null, R extends keyof T = null> = Partial<Omit<T,O>> & { [P in R]-?: T[P] }
export type Nullable<T> = { [K in keyof T]: T[K] | null }