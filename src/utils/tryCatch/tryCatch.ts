import {
  CancelablePromise,
  toCancelablePromise,
} from '../../CancelablePromise';
import {
  TTryCatchCallbackConfig,
  TTryCatchCallbackPromiseConfig,
  TTryCatchPromiseResult,
  TTryCatchResult,
} from './tryCatch.types';

/**
 * Try to execute a callback and catch any error.
 * @param {TFunction} callback the callback to be executed
 * @param {TTryCatchCallbackConfig} config parameters to configure the execution
 * @returns {TTryCatchResult} the result of the execution
 * @template TError the type of the error
 * @template TFunction the type of the callback
 * @template TResult the type of the result
 * @example const { error, result } = tryCatch(() => {
 *  throw new Error('Error');
 * });
 * console.log(error); // Error: Error
 * console.log(result); // null
 * @example const { error, result } = tryCatch(() => {
 * return 'result';
 * });
 * console.log(error); // null
 * console.log(result); // result
 * */
export const tryCatch = <
  TError,
  TFunction extends () => unknown,
  TResult = ReturnType<TFunction>
>(
  callback: TFunction,
  config: TTryCatchCallbackConfig<TResult> = {}
): TTryCatchResult<TResult, TError> => {
  const { defaultResult: errorResult = null, exceptionHandlingType = 'error' } =
    config;

  try {
    const result = callback() as TResult;

    return {
      error: null,
      result,
    };
  } catch (error) {
    if (exceptionHandlingType !== 'ignore') {
      console[exceptionHandlingType](error);
    }

    return {
      error: error as TError,
      result: errorResult as TResult,
    };
  }
};

/**
 * try to execute an async callback and catch any error.
 * @param {TError} error the type of error that the promise will throw if rejected
 * @param {TSource} source the callback or promise to be handled
 * @param {TTryCatchCallbackPromiseConfig} config parameters to configure the execution
 * @param {boolean} config.ignoreCancel if true, the error will be ignored log if the promise is canceled, default true
 * @param {TResult} config.defaultResult the default result if the promise is rejected, to avoid null or undefined on result property
 * @param {TExceptionHandlingType} config.exceptionHandlingType the type of log to be used when the promise is rejected, default 'error' and ignore for cancelled promise
 * @returns {TTryCatchPromiseResult} the result of the execution
 * @template TError the type of the error
 * @template TSource the type of the callback or promise
 * @template TResult the type of the result, depends on the type of the callback or promise
 * @example
 * const { error, result, promise } = await tryCatchPromise(async () => {
 *  throw new Error('Error');
 * });
 *
 * console.log(error); // Error: Error
 * console.log(result); // null
 * console.log(promise); // CancelablePromise {status: "rejected", value: Error: Error}
 *
 * @example const { error, result, promise } = await tryCatchPromise(async () => {
 *  return 'result';
 * });
 *
 * console.log(error); // null
 * console.log(result); // result
 * console.log(promise); // CancelablePromise {status: "resolved", value: "result"}
 *
 * @example
 * const promise = new CancelablePromise((resolve, reject) => {
 *  setTimeout(() => {
 *    reject(new Error('Error'));
 *  }, 1000);
 * });
 *
 * const { error, result, promise: { status } } = await tryCatchPromise(promise);
 *
 * console.log(error); // Error: Error
 * console.log(result); // null
 * console.log(status); // rejected
 */
export const tryCatchPromise = async <
  TError,
  TSource extends
    | (() => CancelablePromise | Promise<unknown> | unknown)
    | CancelablePromise,
  TResult = Awaited<
    TSource extends CancelablePromise
      ? TSource
      : ReturnType<TSource extends Function ? TSource : never>
  >
>(
  source: TSource,
  config?: TTryCatchCallbackPromiseConfig<TResult>
): TTryCatchPromiseResult<TResult, TError> => {
  const {
    defaultResult: errorResult = null,
    exceptionHandlingType = 'error',
    ignoreCancel = true,
  } = config || {};
  let promise: CancelablePromise<TResult> = null;
  let result: TResult = null;
  let error: TError = null;

  try {
    const isSourceCancelablePromise = source instanceof CancelablePromise;

    // if the source is a CancelablePromise, just await it
    if (isSourceCancelablePromise) {
      promise = source as unknown as CancelablePromise<TResult>;
      result = await promise;

      return;
    }

    // if the source is a function we need to execute it
    const callbackResult = (
      source as () => unknown
    )() as CancelablePromise<TResult>;

    const isCancelableResultCancelablePromise =
      callbackResult instanceof CancelablePromise;

    // if the result of the callback is not a CancelablePromise, we need to convert it to one
    promise = isCancelableResultCancelablePromise
      ? callbackResult
      : toCancelablePromise(callbackResult);

    // await the promise
    result = await promise;
  } catch (_error) {
    error = _error as TError;
    result = errorResult as TResult;

    if (exceptionHandlingType == 'ignore') return;

    const isCancel = promise.status === 'canceled';
    if (isCancel && ignoreCancel) return;

    console[exceptionHandlingType](error);
  } finally {
    return {
      error,
      result,
      promise,
    };
  }
};
