import { CancelablePromise } from '../../CancelablePromise';

export type TExceptionHandlingType = 'error' | 'warn' | 'ignore';

export type TTryCatchCallbackConfig<TResult = unknown> = {
  exceptionHandlingType?: TExceptionHandlingType;
  defaultResult?: Partial<TResult> | null;
};

export type TTryCatchCallbackPromiseConfig<TResult = unknown> =
  TTryCatchCallbackConfig<TResult> & {
    ignoreCancel?: boolean;
  };

export type TTryCatchResult<TResult = unknown, TError = unknown> = {
  error: TError;
  result: TResult;
};

export type TTryCatchPromiseResult<
  TResult = unknown,
  TError = unknown
> = Promise<
  TTryCatchResult<TResult, TError> & {
    promise: CancelablePromise<TResult>;
  }
>;
