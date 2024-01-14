import { CancelablePromise } from '../src/CancelablePromise';
import { CancelableAbortController } from '../src/CancelablePromise/CancelableAbortController';

describe('CancelablePromise', () => {
  it('should create a CancelablePromise', () => {
    const promise = new CancelablePromise<string>(() => {});

    expect(promise.status).toBe('pending');
    expect(promise.onCancel).toBeInstanceOf(Function);
    expect(promise.cancel).toBeInstanceOf(Function);
    expect(promise.then).toBeInstanceOf(Function);
    expect(promise.catch).toBeInstanceOf(Function);
    expect(promise.finally).toBeInstanceOf(Function);
  });

  it('should resolve the promise', async () => {
    const promise = new CancelablePromise<string>((resolve) => {
      setTimeout(() => {
        resolve('result');
      }, 0);
    });

    const result = await promise;

    expect(result).toBe('result');
    expect(promise.status).toBe('resolved');
  });

  it('should reject the promise', () => {
    const promise = new CancelablePromise<string>((_, reject) => {
      reject('error');
    });

    return promise.catch((error) => {
      expect(error).toBe('error');
      expect(promise.status).toBe('rejected');
    });
  });

  it('should cancel the promise', () => {
    const promise = new CancelablePromise<string>((_, __, utils) => {
      utils.cancel();
    });

    return promise.catch((error) => {
      expect(error).toBe(null);
      expect(promise.status).toBe('canceled');
    });
  });

  it('should cancel the promise with a custom error', () => {
    const promise = new CancelablePromise<string>((_, __, utils) => {
      utils.cancel('error');
    });

    return promise.catch((error) => {
      expect(error).toBe('error');
      expect(promise.status).toBe('canceled');
    });
  });

  it('it should execute the own onCancel callback', () => {
    expect.assertions(1);

    const promise = new CancelablePromise<string>((_, __, utils) => {
      utils.onCancel(() => {
        console.info('onCancel');
      });
    });

    return promise.cancel().catch(() => {
      expect(console.info).toBeCalledWith('onCancel');
    });
  });

  it('shoul not execute promise.then if the promise is canceled', async () => {
    expect.assertions(1);

    const promise = new CancelablePromise<string>((resolve) => {
      setTimeout(() => {
        resolve('result');
      }, 1000);
    });

    promise.cancel();

    promise
      .then(() => {
        expect(true).toBe(false);
      })
      .catch(() => {
        expect(true).toBe(true);
      });
  });

  it('should cancel all the chained promises if cancel is called', () => {
    expect.assertions(3);

    const promise = new CancelablePromise((resolve, reject, utils) => {
      utils.onCancel(() => {
        reject('canceled');
      });
    });

    promise
      .then(() => {
        // this should not be executed
        expect(true).toBe(true);
        throw 'test fail';
      })
      .then(() => {
        // this should not be executed
        expect(true).toBe(true);
        throw 'test fail';
      })
      .catch((reason) => {
        expect(reason).toBe('canceled');

        return 'handled';
      })
      .catch(() => {
        // this should not be executed
        expect(true).toBe(true);
        throw 'test fail';
      })
      .then((result) => {
        expect(result).toBe('handled');
      });

    promise
      .then(() => {
        // this should not be executed
        expect(true).toBe(true);
        throw 'test fail';
      })
      .catch((reason) => {
        expect(reason).toBe('canceled');

        return 'handled';
      });

    return promise.cancel('canceled').catch(() => {});
  });

  it('should cancel all the chained promises if cancel is called', () => {
    const promise = new CancelablePromise((resolve) => {
      setTimeout(() => {
        resolve();
      }, 1000);
    });

    const childPromise = promise.then(() => {
      return 'result';
    });

    return childPromise.cancel().catch(() => {
      expect(childPromise.status).toBe('canceled');
      expect(promise.status).toBe('canceled');
    });
  });

  it('should unsubscribe to inner onCancel subscription', async () => {
    expect.assertions(2);

    const callsLogger = jest.fn();

    const promise = new CancelablePromise(async (resolve, _, { onCancel }) => {
      const unsubscribe = onCancel(() => {
        callsLogger('onCancel');
      });

      await new Promise((resolve) => setTimeout(resolve, 10));

      unsubscribe();

      await new Promise((resolve) => setTimeout(resolve, 10));

      resolve();
    });

    // 10ms is enough for the first segment of the promise to be executed once the onCancel doesn't make sense anymore
    await new Promise((resolve) => setTimeout(resolve, 10));

    await promise.cancel().catch(() => {
      expect(callsLogger).not.toBeCalled();
      expect(promise.status).toBe('canceled');
    });
  });

  it('should unsubscribe to inner onProgress subscription', async () => {
    expect.assertions(3);

    const callsLogger = jest.fn();

    const promise = new CancelablePromise(
      async (resolve, _, { onProgress, reportProgress }) => {
        const unsubscribe = onProgress(() => {
          callsLogger('onProgress');
        });

        reportProgress(10);

        unsubscribe();

        reportProgress(10);

        resolve();
      },
    );

    await promise;

    expect(callsLogger).toBeCalledTimes(1);
    expect(callsLogger).toBeCalledWith('onProgress');
    expect(promise.status).toBe('resolved');
  });

  it('should unsubscribe onCancel with CancelableAbortController', async () => {
    expect.assertions(2);

    const callsLogger = jest.fn();

    const subscriptionController = new CancelableAbortController();

    const promise = new CancelablePromise((resolve) => {
      setTimeout(() => resolve, 100);
    }).onCancel(() => {
      callsLogger('onCancel');
    }, subscriptionController);

    subscriptionController.abort();
    subscriptionController.dispose();

    await promise.cancel().catch(() => {
      expect(callsLogger).not.toBeCalled();
      expect(promise.status).toBe('canceled');
    });
  });

  it('should unsubscribe onProgress with CancelableAbortController', async () => {
    expect.assertions(2);

    const callsLogger = jest.fn();

    const subscriptionController = new CancelableAbortController();

    const promise = new CancelablePromise((resolve, _, { reportProgress }) => {
      setTimeout(() => {
        reportProgress(10);

        resolve();
      }, 10);
    }).onProgress(() => {
      callsLogger('onProgress');
    }, subscriptionController);

    subscriptionController.abort();
    subscriptionController.dispose();

    await promise.then(() => {
      expect(callsLogger).not.toBeCalled();
      expect(promise.status).toBe('resolved');
    });
  });

  it('should be able to unsubscribe specific callbacks', async () => {
    expect.assertions(2);

    const callsLogger = jest.fn();

    const abortController = new CancelableAbortController();

    const promise = new CancelablePromise((resolve, _, { reportProgress }) => {
      setTimeout(() => {
        reportProgress(10);

        resolve();
      }, 10);
    })
      .onProgress(() => {
        callsLogger('onProgress');
      }, abortController)
      .onCancel(() => {
        callsLogger('onCancel');
      }, abortController);

    expect(abortController.subscriptions.length).toBe(2);

    const [unsubscribeOnProgress] = abortController.subscriptions;

    unsubscribeOnProgress();

    await promise;

    expect(callsLogger).toBeCalledTimes(1);
  });
});
