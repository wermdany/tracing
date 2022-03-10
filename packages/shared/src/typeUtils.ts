export type ObjectType<K extends keyof any = string, V = any> = Record<K, V>;

export type NonFunctionPropertyNames<T> = {
  [K in keyof T]: T[K] extends (...args: any) => any ? never : K;
}[keyof T];

export type NonFunctionProperties<T> = Pick<T, NonFunctionPropertyNames<T>>;

export type AnyFunction = (...args: any[]) => any;

export type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (k: infer I) => void
  ? I
  : never;

export type RemoveIndexSignature<T> = {
  [K in keyof T as string extends K ? never : number extends K ? never : symbol extends K ? never : K]: T[K];
};

export type GetInstanceType<T extends new (...args: any) => any> = T extends new (...args: any) => infer I
  ? I
  : any;

export type GetConstructorParameters<T extends new (...args: any) => any> = T extends new (
  ...args: infer P
) => any
  ? P
  : never;

export type TupleValues<T extends readonly unknown[] | []> = T extends [infer A, ...infer B]
  ? A | TupleValues<B>
  : never;
