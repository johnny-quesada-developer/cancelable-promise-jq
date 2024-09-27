import { CancelableAbortSignal } from './CancelableAbortController';
import { toCancelablePromise } from './CancelablePromise.utils';

export type PromiseCanceledResult = {
  status: 'canceled';
  reason?: unknown;
};

export type TPromiseSettledResult<T> =
  | PromiseFulfilledResult<T>
  | PromiseRejectedResult
  | PromiseCanceledResult;

export type TPromiseStatus = 'canceled' | 'pending' | 'resolved' | 'rejected';

export type TResolveCallback<TResult> = (
  value?: TResult | PromiseLike<TResult>,
) => void;

export type TRejectCallback = (reason?: unknown) => void;

export type TCancelCallback = (reason?: unknown) => void;

export type TSubscriptionParams = {
  signal?: CancelableAbortSignal;
};

export type Subscription = () => void;

export type TCancelablePromiseUtils<TResult = unknown> = {
  cancel: (reason?: unknown) => CancelablePromise<TResult>;
  onCancel: (callback: TCancelCallback) => Subscription;
  onProgress: (callback: TOnProgressCallback) => Subscription;
  reportProgress: (percentage: number, metadata?: unknown) => void;
};

export type TCancelablePromiseCallback<TResult = unknown> = (
  resolve: TResolveCallback<TResult>,
  reject: TRejectCallback,
  utils: TCancelablePromiseUtils<TResult>,
) => void;

/**
 * Callback for the reportProgress event of the promise.
 */
export type TOnProgressCallback = (
  progress: number,
  metadata?: unknown,
) => void;

export type TCancelablePromiseBuildCallback<T = unknown> = () =>
  | Promise<T>
  | CancelablePromise<T>;

export type TCancelablePromiseData = Record<string, unknown> & {
  group?: {
    promises: CancelablePromise[];
  };
};

export type TDecoupledCancelablePromise<TResult = unknown> = {
  promise: CancelablePromise<TResult>;
  resolve: TResolveCallback<TResult>;
  reject: TRejectCallback;
} & TCancelablePromiseUtils<TResult>;

export type TCancelablePromiseGroupConfig = {
  maxConcurrent?: number;
  executeInOrder?: boolean;
  beforeEachCallback?: () => void;
  afterEachCallback?: (result: unknown) => void;
  onQueueEmptyCallback?: (result: unknown[] | null) => void;
};

/**
 * CancelablePromise is a Promise that can be canceled.
 * It is a Promise that has a status property that can be 'pending', 'resolved', 'rejected' or 'canceled'.
 * It has an onCancel method that allows to register a callback that will be called when the promise is canceled.
 * It has a cancel method that allows to cancel the promise.
 * @param {TCancelablePromiseCallback<TResult>} [callback] the callback of the promise, it will receive the resolve, reject and cancel functions
 * @param {TCancelablePromiseData<TMetadata>} [data] the data of the promise
 * @constructor
 * @example
 * const promise = new CancelablePromise((resolve, reject, utils) => {
 *   resolve('resolved');
 * });
 *
 * promise.then((value) => {
 *  console.log(value); // 'resolved'
 * });
 *
 * @example
 * const promise = new CancelablePromise((resolve, reject, utils) => {
 *  utils.cancel('canceled');
 * });
 *
 * promise.catch((reason) => {
 * console.log(reason); // 'canceled'
 * console.log(promise.status); // 'canceled'
 * });
 */
export class CancelablePromise<TResult = void> extends Promise<TResult> {
  /**
   * The status of the promise.
   */
  public status: TPromiseStatus = 'pending';

  private cancelCallbacks: Set<TCancelCallback> = new Set();
  private ownCancelCallbacks: Set<TCancelCallback> = new Set();

  /**
   * The callbacks to be called when reportProgress is called.
   */
  private onProgressCallbacks: Set<TOnProgressCallback> = new Set();

  private disposeCallbacks = () => {
    this.cancelCallbacks = new Set();
    this.ownCancelCallbacks = new Set();
    this.onProgressCallbacks = new Set();
  };

  /**
   * Resolve the promise.
   * @param {TResult} [value] the value of the resolution
   * */
  private _resolve: TResolveCallback<TResult>;

  /**
   * Cancel the promise.
   * @param {unknown} [reason] the reason of the cancellation
   * */
  private _reject: TRejectCallback;

  constructor(callback: TCancelablePromiseCallback<TResult>) {
    let resolve: TResolveCallback<TResult>;
    let reject: TRejectCallback;

    // extract the original Promise callbacks
    super((_resolve, _reject) => {
      resolve = _resolve;
      reject = _reject;
    });

    this._resolve = resolve;
    this._reject = reject;

    // execute the custom callback with cancelable functions
    callback(
      (value) => {
        this.status = 'resolved';
        this.disposeCallbacks();

        this._resolve(value);
      },
      (reason) => {
        this.status = 'rejected';
        this.disposeCallbacks();

        this._reject(reason);
      },
      {
        cancel: (reason) => {
          return this.cancel(reason);
        },
        onCancel: (callback) => {
          return this.subscribeToOwnCancelEvent(callback);
        },
        onProgress: (callback) => {
          this.onProgress(callback);

          return () => {
            this.onProgressCallbacks.delete(callback);
          };
        },
        reportProgress: (percentage, metadata) => {
          this.reportProgress(percentage, metadata);
        },
      },
    );

    /**
     * Override the then method to return a CancelablePromise.
     * We need to override this here to avoid the bundler to polyfill the Promise.
     */
    this.then = <TResult1 = TResult, TResult2 = never>(
      onfulfilled?:
        | ((value: TResult) => TResult1 | PromiseLike<TResult1>)
        | undefined
        | null,
      onrejected?:
        | ((reason: unknown) => TResult2 | PromiseLike<TResult2>)
        | undefined
        | null,
    ): CancelablePromise<TResult1 | TResult2> => {
      const { promise, resolve, reject } = this.createChildPromise<
        TResult1 | TResult2
      >();

      super.then(onfulfilled, onrejected).then(resolve, reject);

      return promise;
    };

    /**
     * Override the catch method to return a CancelablePromise.
     * We need to override this here to avoid the bundler to polyfill the Promise.
     * */
    this.catch = <T = unknown>(
      onrejected?: (reason: any) => T | PromiseLike<T>,
    ): CancelablePromise<T | TResult> => {
      const { promise, resolve, reject } = this.createChildPromise<
        T | TResult
      >();

      super.catch(onrejected).then(resolve, reject);

      return promise;
    };

    /**
     * Override the finally method to return a CancelablePromise.
     */
    this.finally = (onfinally?: () => void): CancelablePromise<TResult> => {
      const { promise, resolve, reject } = this.createChildPromise<TResult>();

      super.finally(onfinally).then(resolve, reject);

      return promise;
    };
  }

  /**
   * Subscribe to the cancel event of the promise.
   * @param {TCancelCallback} callback the callback to be called when the promise is canceled
   * */
  private subscribeToOwnCancelEvent: (
    callback: TCancelCallback,
  ) => Subscription = (callback) => {
    this.ownCancelCallbacks.add(callback);

    return () => {
      this.ownCancelCallbacks.delete(callback);
    };
  };

  /**
   * Cancel the promise and all the chained promises.
   * @param {unknown} [reason] the reason of the cancellation
   * @returns {CancelablePromise} the promise itself
   * */
  public cancel = (reason?: unknown): CancelablePromise<TResult> => {
    // we cannot cancel promises that are completed
    if (this.status !== 'pending') return this;

    this.status = 'canceled';

    const _reason = reason === undefined ? new Error('Promise canceled') : reason;

    // the own promise cancel callbacks are called first
    this.ownCancelCallbacks.forEach((callback) => callback(_reason));

    // then the promise cancel second level subscribers
    this.cancelCallbacks.forEach((callback) => callback(_reason));

    this._reject(_reason);
    this.disposeCallbacks();

    return this;
  };

  /**
   * Subscribe to the cancel event of the promise.
   * @param {TCancellablePromiseCallback} [callback] the callback to be called when the promise is canceled
   * @returns {CancelablePromise} the promise itself
   * */
  public onCancel = (
    callback: TCancelCallback,
    { signal }: TSubscriptionParams = {},
  ): CancelablePromise<TResult> => {
    this.cancelCallbacks.add(callback);

    signal?.subscribe(() => {
      this.cancelCallbacks.delete(callback);
    });

    return this;
  };

  /**
   * This method allows to report the progress across the chain of promises.
   * */
  public onProgress = (
    callback: TOnProgressCallback,
    { signal }: TSubscriptionParams = {},
  ): CancelablePromise<TResult> => {
    this.onProgressCallbacks.add(callback);

    signal?.subscribe(() => {
      this.onProgressCallbacks.delete(callback);
    });

    return this;
  };

  /**
   * This allows to report progress across the chain of promises,
   * this is useful when you have an async operation that could take a long time and you want to report the progress to the user.
   */
  public reportProgress = (percentage: number, metadata?: unknown) => {
    this.onProgressCallbacks.forEach((callback) =>
      callback(percentage, metadata),
    );

    return this;
  };

  /**
   * Returns a Promise that resolves or rejects as soon as the previous promise is resolved or rejected,
   * with cancelable promise you can call the cancel method on the child promise to cancel all the parent promises.
   * inherits the onProgressCallbacks array from the parent promise to the child promise so the progress can be reported across the chain
   */
  private createChildPromise = <TResult1>() => {
    let resolve: TResolveCallback<TResult1>;
    let reject: TRejectCallback;

    const promise = new CancelablePromise<TResult1>(
      (_resolve, _reject, _utils) => {
        resolve = _resolve;
        reject = _reject;
      },
    );

    // share the reference of the onProgressCallbacks array between the promises so the progress can be reported
    promise.onProgressCallbacks = this.onProgressCallbacks;

    // cancels the parent promise when the child promise is canceled
    promise.onCancel((reason) => {
      this.cancel(reason);
    });

    return {
      promise,
      resolve,
      reject,
    };
  };

  /**
   * Returns a Promise that resolves or rejects as soon as the previous promise is resolved or rejected,
   * with cancelable promise you can call the cancel method on the child promise to cancel all the parent promises.
   * @param {((value: TResult) => TResult1 | PromiseLike<TResult1>) | undefined | null} [onfulfilled] the callback to be called when the promise is resolved
   * @param {((reason: unknown) => TResult2 | PromiseLike<TResult2>) | undefined | null} [onrejected] the callback to be called when the promise is rejected
   * @returns {CancelablePromise<TResult1 | TResult2>} the cancelable promise
   * @example
   * const promise = new CancelablePromise((resolve, reject, utils) => {
   *  setTimeout(() => {
   *   resolve('resolved');
   *  }, 1000);
   * });
   *
   * const childPromise = promise.then((value) => {
   *  console.log(value); // 'resolved'
   * });
   *
   * childPromise.cancel();
   * console.log(childPromise.status); // 'canceled'
   * console.log(promise.status); // 'canceled'
   */
  public then: <TResult1 = TResult, TResult2 = never>(
    onfulfilled?:
      | ((value: TResult) => TResult1 | PromiseLike<TResult1>)
      | undefined
      | null,
    onrejected?:
      | ((reason: unknown) => TResult2 | PromiseLike<TResult2>)
      | undefined
      | null,
  ) => CancelablePromise<TResult1 | TResult2>;

  /**
   * Returns a Promise that resolves when the previous promise is rejected,
   * with cancelable promise you can call the cancel method on the child promise to cancel all the parent promises.
   * @param {((reason: any) => T | PromiseLike<T>) | undefined | null} [onrejected] the callback to be called when the promise is rejected
   * @returns {CancelablePromise<T>} the cancelable promise
   * @example
   * const promise = new CancelablePromise((resolve, reject, utils) => {
   *  setTimeout(() => {
   *    reject('rejected');
   *  }, 1000);
   * });
   *
   * const childPromise = promise.catch(() => {
   *  console.log(childPromise.status); // 'canceled'
   *  console.log(promise.status); // 'canceled'
   * });
   *
   * childPromise.cancel();
   * */
  public catch: <T = unknown>(
    onrejected?: (reason: any) => T | PromiseLike<T>,
  ) => CancelablePromise<TResult | T>;

  /**
   * Subscribe a callback to be called when the promise is resolved or rejected,
   */
  public finally: (
    onfinally?: (() => void) | undefined | null,
  ) => CancelablePromise<TResult>;

  /**
   * Statics
   */

  public static resolve(): CancelablePromise<void>;

  public static resolve<TResult>(
    value: TResult,
  ): CancelablePromise<Awaited<TResult>>;

  public static resolve<TResult>(
    value: TResult | PromiseLike<TResult>,
  ): CancelablePromise<Awaited<TResult>>;

  static resolve<TResult>(
    value?: TResult,
  ): CancelablePromise<Awaited<TResult>> {
    return new CancelablePromise<Awaited<TResult>>((resolve) =>
      resolve(value as Awaited<TResult>),
    );
  }

  public static reject = (reason?: unknown): CancelablePromise<never> => {
    return new CancelablePromise((_, reject) => reject(reason));
  };

  /**
   * Returns a Promise object with status 'canceled'.
   */
  public static canceled = (reason?: unknown): CancelablePromise<never> => {
    return new CancelablePromise((_, __, { cancel }) => cancel(reason));
  };

  /**
   * Creates a Promise that is resolved or rejected when any of the provided Promises are resolved or rejected.
   * If the race is canceled, all the promises are canceled.
   */
  public static race = <TResult>(
    values: Array<TResult | PromiseLike<TResult> | CancelablePromise<TResult>>,
  ): CancelablePromise<Awaited<TResult>> => {
    return new CancelablePromise<Awaited<TResult>>(
      (resolve, reject, { onCancel, cancel: parentCancel }) => {
        values.forEach((promise) => {
          const cancelable = toCancelablePromise<unknown, Awaited<TResult>>(
            promise,
          );

          onCancel(() => {
            cancelable.cancel();
          });

          cancelable.then(resolve, (reason) => {
            if (cancelable.status === 'canceled') {
              // cancel parent promise
              parentCancel(reason);

              return;
            }

            reject(reason);
          });
        });
      },
    );
  };

  /**
   * Creates a Promise that is resolved with an array of results when all of the provided Promises resolve, or rejected when any Promise is rejected.
   * If the all is canceled, all the promises are canceled.
   */
  public static all = <TSource extends readonly unknown[] | []>(
    values: TSource,
  ): CancelablePromise<{
    -readonly [P in keyof TSource]: Awaited<TSource[P]>;
  }> => {
    type Result = {
      -readonly [P in keyof TSource]: Awaited<TSource[P]>;
    };

    return new CancelablePromise<Result>(
      (resolve, reject, { onCancel, cancel: parentCancel }) => {
        const results: Map<CancelablePromise<unknown>, unknown> = new Map();
        const promisesLength = values.length;
        let resultsLength = 0;

        values.forEach((promise) => {
          const cancelable = toCancelablePromise<unknown, unknown>(promise);

          results.set(cancelable, null);

          onCancel(() => {
            cancelable.cancel();
          });

          cancelable.then(
            (result) => {
              resultsLength++;
              results.set(cancelable, result);

              const isAllResolved = resultsLength === promisesLength;

              if (!isAllResolved) return;

              resolve(Array.from(results.values()) as Result);
            },
            (reason) => {
              if (cancelable.status === 'canceled') {
                // cancel parent promise
                parentCancel(reason);

                return;
              }

              reject(reason);
            },
          );
        });
      },
    );
  };

  /**
   * Creates a Promise that is resolved with an array of results when all
   * of the provided Promises resolve or reject.
   * If the allSettled is canceled, all the promises are canceled.
   * @param values An array of Promises.
   * @returns A new Promise.
   */
  static allSettled = <TResult extends readonly unknown[] | []>(
    values: TResult,
  ): CancelablePromise<{
    -readonly [P in keyof TResult]: PromiseSettledResult<Awaited<TResult[P]>>;
  }> => {
    type Result = {
      -readonly [P in keyof TResult]: PromiseSettledResult<Awaited<TResult[P]>>;
    };

    return new CancelablePromise<Result>((resolve, _, { onCancel }) => {
      const results: Map<
        CancelablePromise<unknown>,
        PromiseSettledResult<unknown>
      > = new Map();

      const promisesLength = values.length;
      let resultsLength = 0;

      values.forEach((value) => {
        const cancelable = toCancelablePromise<unknown, unknown>(value);

        results.set(cancelable, null);

        onCancel(() => {
          cancelable.cancel();
        });

        cancelable
          .then(
            (result) => {
              results.set(cancelable, {
                status: 'fulfilled',
                value: result,
              });
            },
            (reason) => {
              results.set(cancelable, {
                status: (cancelable.status === 'canceled'
                  ? 'canceled'
                  : ('rejected' as unknown)) as 'rejected',
                reason,
              });
            },
          )
          .finally(() => {
            resultsLength++;

            const isAllResolved = resultsLength === promisesLength;

            if (!isAllResolved) return;

            resolve(Array.from(results.values()) as Result);
          });
      });
    });
  };
}

/**
 * The constructor of the cancelable promise should be the same as the Promise constructor
 */
CancelablePromise.prototype.constructor = Promise;
