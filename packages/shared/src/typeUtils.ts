export type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (k: infer I) => void
  ? I
  : never;

export type RemoveIndexSignature<T> = {
  [K in keyof T as string extends K ? never : number extends K ? never : symbol extends K ? never : K]: T[K];
};

export type PartialOmit<T extends Record<string, any>, K extends keyof T> = Partial<Omit<T, K>> & Pick<T, K>;
