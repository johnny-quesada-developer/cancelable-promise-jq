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
});
