import { CancelablePromise } from '../src/CancelablePromise';

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

  it('should reject the promise', async () => {
    const promise = new CancelablePromise<string>((_, reject) => {
      reject('error');
    });

    promise.catch((error) => {
      expect(error).toBe('error');
      expect(promise.status).toBe('rejected');
    });
  });

  it('should cancel the promise', async () => {
    const promise = new CancelablePromise<string>((_, __, utils) => {
      utils.cancel();
    });

    promise.catch((error) => {
      expect(error).toBe(null);
      expect(promise.status).toBe('canceled');
    });
  });

  it('should cancel the promise with a custom error', async () => {
    const promise = new CancelablePromise<string>((_, __, utils) => {
      utils.cancel('error');
    });

    promise.catch((error) => {
      expect(error).toBe('error');
      expect(promise.status).toBe('canceled');
    });
  });

  it('it should execute the own onCancel callback', async () => {
    expect.assertions(1);

    const promise = new CancelablePromise<string>((_, __, utils) => {
      utils.onCancel(() => {
        console.info('onCancel');
      });
    });

    promise.cancel().catch(() => {
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

  it('should cancell all the chained promises if cancel is called', async () => {
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

    promise.cancel('canceled');
  });

  it('should cancell all the chained promises if cancel is called', async () => {
    const promise = new CancelablePromise((resolve) => {
      setTimeout(() => {
        resolve();
      }, 1000);
    });

    const childPromise = promise.then(() => {
      return 'result';
    });

    childPromise.cancel().catch(() => {
      expect(childPromise.status).toBe('canceled');
      expect(promise.status).toBe('canceled');
    });
  });
});
