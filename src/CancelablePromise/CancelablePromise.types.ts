export type TPromiseStatus = 'canceled' | 'pending' | 'resolved' | 'rejected';

export type TResolveCallback<TResult> = (
  value?: TResult | PromiseLike<TResult>
) => void;

export type TRejectCallback = (reason?: unknown) => void;
export type TCancelCallback = (reason?: unknown) => void;

export type TCancelablePromiseUtils<TResult = unknown> = {
  cancel: (reason?: unknown) => TCancelablePromise<TResult>;
  onCancel: (callback: TCancelCallback) => TCancelablePromise<TResult>;
};

export type TCancelablePromiseCallback<TResult = unknown> = (
  resolve: TResolveCallback<TResult>,
  reject: TRejectCallback,
  utils: TCancelablePromiseUtils<TResult>
) => void;

/**
 * Callback for the reportProgress event of the promise.
 */
export type TOnProgressCallback = (progressPercentage: number) => void;

export type TCancelablePromiseBuildCallback<T = unknown> = () =>
  | Promise<T>
  | TCancelablePromise<T>;

export type TCancelablePromiseData = Record<string, unknown> & {
  group?: {
    promises: TCancelablePromise[];
  };
};

export interface TCancelablePromise<TResult = unknown>
  extends Promise<TResult> {
  status: TPromiseStatus;
  onCancel: TCancelablePromiseUtils<TResult>['onCancel'];
  cancel: TCancelablePromiseUtils<TResult>['cancel'];
  data: TCancelablePromiseData;
}

export type TDecoupledCancelablePromise<TResult = unknown> = {
  promise: TCancelablePromise<TResult>;
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
