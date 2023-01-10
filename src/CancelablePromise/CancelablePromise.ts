import {
  TPromiseStatus,
  TResolveCallback,
  TRejectCallback,
  TCancelablePromise,
  TCancelCallback,
  TCancelablePromiseCallback,
  TCancelablePromiseData,
} from './CancelablePromise.types';

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
export class CancelablePromise<TResult>
  extends Promise<TResult>
  implements TCancelablePromise<TResult>
{
  /**
   * The status of the promise.
   */
  public status: TPromiseStatus = 'pending';

  /**
   * extra data of the promise util for debugging
   */
  public data: TCancelablePromiseData = {};

  private cancelCallbacks: TCancelCallback[] = [];
  private ownCancelCallbacks: TCancelCallback[] = [];

  /**
   * Resolve the promise.
   * @param {TResult} [value] the value of the resolution
   * */
  private resolve: TResolveCallback<TResult>;

  /**
   * Cancel the promise.
   * @param {unknown} [reason] the reason of the cancellation
   * */
  private reject: TRejectCallback;

  constructor(callback: TCancelablePromiseCallback<TResult>) {
    let resolve: TResolveCallback<TResult>;
    let reject: TRejectCallback;

    // extract the original Promise callbacks
    super((_resolve, _reject) => {
      resolve = _resolve;
      reject = _reject;
    });

    this.resolve = resolve;
    this.reject = reject;

    // execute the custom callback with cancelable fuctions
    callback(
      (value) => {
        this.status = 'resolved';
        this.resolve(value);
      },
      (reason) => {
        this.status = 'rejected';
        this.reject(reason);
      },
      {
        cancel: (reason) => {
          this.cancel(reason);

          return this;
        },
        onCancel: (callback) => {
          this.subscribeToOwnCancelEvent(callback);

          return this;
        },
      }
    );
  }

  /**
   * Subscribe to the cancel event of the promise.
   * @param {TCancelCallback} callback the callback to be called when the promise is canceled
   * */
  private subscribeToOwnCancelEvent: (callback: TCancelCallback) => void = (
    callback
  ) => {
    this.ownCancelCallbacks.push(callback);
  };

  /**
   * Cancel the promise and all the chained promises.
   * @param {unknown} [reason] the reason of the cancellation
   * @returns {CancelablePromise} the promise itself
   * */
  public cancel = (reason: unknown = null): CancelablePromise<TResult> => {
    // we cannot cancel promises that are completed
    if (this.status !== 'pending') return;

    this.status = 'canceled';

    // the own promise cancel callbacks are called first
    this.ownCancelCallbacks.forEach((callback) => callback(reason));

    // then the promise cancel second level subscribers
    this.cancelCallbacks.forEach((callback) => callback(reason));

    this.reject(reason);
    this.cancelCallbacks = [];
    this.ownCancelCallbacks = [];

    return this;
  };

  /**
   * Subscribe to the cancel event of the promise.
   * @param {TCancellablePromiseCallback} [callback] the callback to be called when the promise is canceled
   * @returns {CancelablePromise} the promise itself
   * */
  public onCancel = (
    callback: TCancelCallback
  ): TCancelablePromise<TResult> => {
    this.cancelCallbacks.push(callback);

    return this;
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
  public then<TResult1 = TResult, TResult2 = never>(
    onfulfilled?:
      | ((value: TResult) => TResult1 | PromiseLike<TResult1>)
      | undefined
      | null,
    onrejected?:
      | ((reason: unknown) => TResult2 | PromiseLike<TResult2>)
      | undefined
      | null
  ) {
    let resolve: TResolveCallback<TResult1>;
    let reject: TRejectCallback;

    const cancelable = new CancelablePromise<TResult1>(
      (_resolve, _reject, _utils) => {
        resolve = _resolve;
        reject = _reject;
      }
    );

    // cancels the parent promise when the child promise is canceled
    cancelable.onCancel((reason) => {
      this.cancel(reason);
    });

    super
      .then(onfulfilled, onrejected)
      .then(
        resolve as (value: TResult1 | TResult2) => void | PromiseLike<void>,
        reject
      );

    return cancelable;
  }

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
  public catch<T = never>(onrejected?: (reason: any) => T | PromiseLike<T>) {
    let resolve: TResolveCallback<T>;
    let reject: TRejectCallback;

    const cancelable = new CancelablePromise<T>((_resolve, _reject, _utils) => {
      resolve = _resolve;
      reject = _reject;
    });

    // cancels the parent promise when the child promise is canceled
    cancelable.onCancel((reason) => {
      this.cancel(reason);
    });

    super
      .catch(onrejected)
      .then(
        resolve as (value: TResult | T) => void | PromiseLike<void>,
        reject
      );

    return cancelable;
  }
}

/**
 * The constructor of the cancelable promise should be the same as the Promise constructor
 */
CancelablePromise.prototype.constructor = Promise;
