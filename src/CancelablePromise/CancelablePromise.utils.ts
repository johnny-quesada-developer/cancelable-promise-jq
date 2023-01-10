import { CancelablePromise } from './CancelablePromise';
import {
  TDecoupledCancelablePromise,
  TResolveCallback,
  TRejectCallback,
  TCancelablePromise,
  TCancelablePromiseUtils,
  TCancelablePromiseBuildCallback,
  TCancelablePromiseGroupConfig,
} from './CancelablePromise.types';

/**
 * Create a decoupled promise.
 * @param {TCreateCancelablePromiseConfig} [callback] the callback of the promise
 * @returns {TDecoupledCancelablePromise} the decoupled promise
 * @returns {TDecoupledCancelablePromise.promise} A CancelablePromise
 * @returns {TDecoupledCancelablePromise.resolve} A function to resolve the promise
 * @returns {TDecoupledCancelablePromise.reject} A function to reject the promise
 * @returns {TDecoupledCancelablePromise.cancel} A function to cancel the promise
 * @returns {TDecoupledCancelablePromise.onCancel} A function to subscribe to the cancel event of the promise
 * @example
 * const { promise, resolve } = createDecoupledPromise();
 *
 * promise.then((result) => {
 *  console.log(result);
 * });
 *
 * resolve('hello world');
 * // hello world
 */
export const createDecoupledPromise = <
  TResult
>(): TDecoupledCancelablePromise<TResult> => {
  let resolve: TResolveCallback<TResult>;
  let reject: TRejectCallback;
  let utils: TCancelablePromiseUtils<TResult>;

  const promise = new CancelablePromise<TResult>(
    (_resolve, _reject, _utils) => {
      resolve = _resolve;
      reject = _reject;
      utils = _utils;
    }
  );

  return { resolve, reject, ...utils, promise };
};

/**
 * Convert a value to a CancelablePromise, the value can be a Promise/CancellablePromise or a value.
 * @param {unknown} source the value to convert
 * @returns {TCancelablePromise<T>} the CancelablePromise
 * @example
 * const promise = new Promise((resolve) => {
 * setTimeout(() => {
 * resolve('hello world');
 * }, 1000);
 * });
 * const cancelablePromise = toCancelablePromise(promise);
 * cancelablePromise.onCancel(() => {
 * console.log('promise canceled');
 * });
 * cancelablePromise.cancel();
 * // promise canceled
 * */
export const toCancelablePromise = <
  T = unknown,
  TResult = T extends Promise<unknown>
    ? TCancelablePromise<Awaited<T>>
    : TCancelablePromise<T>
>(
  source: T
): TCancelablePromise<TResult> => {
  if (source instanceof CancelablePromise) return source;
  if (typeof source === 'function') return toCancelablePromise(source());

  if (!isPromise(source)) {
    return new CancelablePromise<TResult>((resolve) =>
      resolve(source as unknown as TResult)
    );
  }

  let resolve: TResolveCallback<TResult>;
  let reject: TRejectCallback;

  const cancelable = new CancelablePromise<TResult>(
    async (_resolve, _reject, _utils) => {
      resolve = _resolve;
      reject = _reject;

      source.then(
        resolve as (value: unknown) => void | PromiseLike<void>,
        reject
      );
    }
  );

  cancelable.onCancel((reason) => {
    reject(reason);
  });

  return cancelable;
};

/**
 * Group the list of elements into a single CancelablePromise.
 * @param {Array<TCancelablePromiseBuildCallback | TCancelablePromise | Promise<unknown>>} sources the list of elements to group
 * @param {Omit<TAsyncQueueConfig, 'executeImmediately'>} [config] the config to apply to the execution of the group
 * @param {number} [config.maxConcurrent=8] the maximum number of elements to execute concurrently
 * @param {boolean} [config.executeInOrder=false] if true, the elements will be executed in order
 * @param {Function} [config.beforeEachcCallback=null] a callback to execute before each element execution
 * @param {Function} [config.afterEachCallback=null] a callback to execute after each element execution successfully, the callback will receive the result of the element execution unknown
 * @param {Function} [config.onQueueEmptyCallback=null] a callback to execute when the queue is empty, the callback will receive the result of the group execution unknown[][]
 * @returns {TCancelablePromise<TResult>} the CancelablePromise
 * @example
 * const promise1 = new CancelablePromise((resolve) => {
 *  setTimeout(() => {
 *    resolve('hello');
 *  }, 1000);
 * });
 *
 * const promise2 = new CancelablePromise((resolve) => {
 *  setTimeout(() => {
 *    resolve('world');
 *  }, 1000);
 * });
 *
 * const cancelablePromise = groupAsCancelablePromise([promise1, promise2]);
 *
 * cancelablePromise.onCancel(() => {
 *  console.log('promise canceled');
 * });
 *
 * cancelablePromise.cancel();
 * // promise canceled
 * */
export const groupAsCancelablePromise = <TResult extends Array<unknown>>(
  sources: (
    | TCancelablePromiseBuildCallback
    | TCancelablePromise
    | Promise<unknown>
  )[],
  config: TCancelablePromiseGroupConfig = {}
): TCancelablePromise<TResult> | null => {
  if (!sources.length) return null;

  const {
    maxConcurrent = 8,
    executeInOrder = false,
    beforeEachCallback: beforeEachcCallback = null,
    afterEachCallback = null,
    onQueueEmptyCallback = null,
  } = config;

  const queue = [...sources];
  const results: TResult = [] as TResult;

  return new CancelablePromise<TResult>(async (resolve, _, promiseUtils) => {
    const loadCallbacksBatchAsync = async () => {
      if (!queue.length) return;

      // we execute the first batch of callbacks in the queue
      const promises = queue.splice(0, maxConcurrent).map(async (callback) => {
        const result = typeof callback === 'function' ? callback() : callback;

        beforeEachcCallback?.();

        const promise = toCancelablePromise(result);

        // we cancel the promise if the group promise is canceled
        promiseUtils.onCancel(() => {
          promise.cancel();
        });

        promise.then((result) => {
          results.push(result as unknown as TResult[0]);

          afterEachCallback?.(result);
        });

        // if executeInOrder is true, we wait for the promise to resolve before executing the next callback
        return executeInOrder ? await promise : promise;
      });

      await Promise.all(promises);

      // we execute the next batch of callbacks in the queue recursively until the queue is empty
      await loadCallbacksBatchAsync();
    };

    await loadCallbacksBatchAsync();

    onQueueEmptyCallback?.(results);

    // once the queue is empty, we return the results of the promises in the queue
    resolve(results);
  });
};

/**
 * Checks if the value is a Promise
 * @param {unknown} value the value to check
 * @returns {value is Promise<unknown>} true if the value is a Promise, false otherwise
 */
export const isPromise = (value: unknown): value is Promise<unknown> => {
  return Promise.resolve(value) === value;
};
