export type Primitive = number | string | boolean | bigint | symbol | null | undefined;

export type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (k: infer I) => void
  ? I
  : never;

export type RemoveIndexSignature<T> = {
  [K in keyof T as string extends K ? never : number extends K ? never : symbol extends K ? never : K]: T[K];
};

export type PartialOmit<T extends Record<string, any>, K extends keyof T> = Partial<Omit<T, K>> & Pick<T, K>;

export type Choice<T = string> = T[] | ((arg: T) => boolean) | RegExp;

export type AnyFun = (...args: any[]) => any;
