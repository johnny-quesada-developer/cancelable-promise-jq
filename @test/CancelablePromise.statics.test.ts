import { CancelablePromise } from '../src/CancelablePromise';

describe('CancelablePromise Static Methods', () => {
  describe('CancelablePromise.all', () => {
    it('should resolve all the promises', async () => {
      expect.assertions(3);

      const cancelLoggers = jest.fn();

      const promise = CancelablePromise.all([
        new CancelablePromise<string>((resolve, _, { onCancel }) => {
          const timeoutId = setTimeout(() => {
            resolve('result');
          }, 1000);

          onCancel(() => {
            clearTimeout(timeoutId);
            cancelLoggers();
          });
        }),
        new CancelablePromise<number>((resolve, _, { onCancel }) => {
          const timeoutId = setTimeout(() => {
            resolve(1);
          }, 1000);

          onCancel(() => {
            clearTimeout(timeoutId);
            cancelLoggers();
          });
        }),
      ]);

      const results = await promise;

      expect(promise.status).toBe('resolved');
      expect(results).toEqual(['result', 1]);
      expect(cancelLoggers).not.toBeCalled();
    });

    it('should reject the promise', () => {
      const promise = CancelablePromise.all([
        new CancelablePromise<string>((_, reject) => {
          reject('error');
        }),
        new CancelablePromise<number>((_, reject) => {
          reject('error');
        }),
      ]);

      return promise.catch((error) => {
        expect(error).toBe('error');
        expect(promise.status).toBe('rejected');
      });
    });

    it('should cancel the parent promise if one of the child promises is canceled', () => {
      expect.assertions(3);

      const cancelLoggers = jest.fn();

      const promise = CancelablePromise.all([
        new CancelablePromise<string>((_, __, utils) => {
          utils.cancel();
        }),
        new CancelablePromise<number>((_, __, utils) => {
          utils.cancel();
        }),
      ]);

      promise.onCancel(() => {
        cancelLoggers();
      });

      return promise.catch((error) => {
        expect(error).toBeInstanceOf(Error);
        expect(promise.status).toBe('canceled');
        expect(cancelLoggers).toBeCalled();
      });
    });

    it('should cancel all the promises', () => {
      expect.assertions(3);

      const cancelLoggers = jest.fn();

      const promise = CancelablePromise.all([
        new CancelablePromise<string>((_, __, { onCancel }) => {
          onCancel(() => {
            cancelLoggers();
          });
        }),
        new CancelablePromise<string>((_, __, { onCancel }) => {
          onCancel(() => {
            cancelLoggers();
          });
        }),
      ]);

      return promise.cancel().catch((error) => {
        expect(error).toBeInstanceOf(Error);
        expect(promise.status).toBe('canceled');
        expect(cancelLoggers).toBeCalledTimes(2);
      });
    });
  });

  describe('CancelablePromise.allSettled', () => {
    it('should handled resolved promises', async () => {
      expect.assertions(3);

      const cancelLoggers = jest.fn();

      const promise = CancelablePromise.allSettled([
        new CancelablePromise<string>((resolve, _, { onCancel }) => {
          const timeoutId = setTimeout(() => {
            resolve('result');
          }, 1000);

          onCancel(() => {
            clearTimeout(timeoutId);
            cancelLoggers();
          });
        }),
        new CancelablePromise<number>((resolve, _, { onCancel }) => {
          const timeoutId = setTimeout(() => {
            resolve(1);
          }, 1000);

          onCancel(() => {
            clearTimeout(timeoutId);
            cancelLoggers();
          });
        }),
      ]);

      const results = await promise;

      expect(promise.status).toBe('resolved');

      expect(results).toEqual([
        {
          value: 'result',
          status: 'fulfilled',
        },
        {
          value: 1,
          status: 'fulfilled',
        },
      ]);

      expect(cancelLoggers).not.toBeCalled();
    });

    it('should handled rejected promises', async () => {
      expect.assertions(2);

      const promise = CancelablePromise.allSettled([
        new CancelablePromise<string>((_, reject) => {
          reject('error');
        }),
        new CancelablePromise<number>((_, reject) => {
          reject('error');
        }),
      ]);

      const results = await promise;

      expect(promise.status).toBe('resolved');
      expect(results).toEqual([
        {
          reason: 'error',
          status: 'rejected',
        },
        {
          reason: 'error',
          status: 'rejected',
        },
      ]);
    });

    it('should handled canceled promises', async () => {
      expect.assertions(3);

      const promise = CancelablePromise.allSettled([
        new CancelablePromise<string>((_, __, utils) => {
          utils.cancel('canceled1');
        }),
        new CancelablePromise<number>((_, __, utils) => {
          utils.cancel('canceled2');
        }),
      ]);

      const results = await promise as PromiseRejectedResult[];

    
      expect(results.map(x => x.status)).toEqual(['canceled', 'canceled']);
      expect(results.map(x => x.reason)).toEqual(['canceled1', 'canceled2']);
      expect(promise.status).toBe('resolved');
    });

    it('should cancel child promises', async () => {
      expect.assertions(2);

      const cancelLoggers = jest.fn();

      const promise = CancelablePromise.allSettled([
        new CancelablePromise<string>((_, __, { onCancel }) => {
          onCancel(() => {
            cancelLoggers();
          });
        }),
        new CancelablePromise<string>((_, __, { onCancel }) => {
          onCancel(() => {
            cancelLoggers();
          });
        }),
      ]);

      return promise.cancel().catch((error) => {
        expect(promise.status).toBe('canceled');
        expect(cancelLoggers).toBeCalledTimes(2);
      });
    });
  });

  describe('CancelablePromise.race', () => {
    it('should resolve with the first fulfilled promise', async () => {
      expect.assertions(1);

      const promise = CancelablePromise.race([
        new CancelablePromise<string>((resolve) => {
          setTimeout(() => {
            resolve('first');
          }, 100);
        }),
        new CancelablePromise<string>((resolve) => {
          setTimeout(() => {
            resolve('second');
          }, 200);
        }),
      ]);

      const result = await promise;

      expect(result).toBe('first');
    });

    it('should reject with the first rejected promise', async () => {
      expect.assertions(1);

      const promise = CancelablePromise.race([
        new CancelablePromise<string>((_, reject) => {
          setTimeout(() => {
            reject('error1');
          }, 100);
        }),
        new CancelablePromise<string>((_, reject) => {
          setTimeout(() => {
            reject('error2');
          }, 200);
        }),
      ]);

      await expect(promise).rejects.toBe('error1');
    });

    it('should cancel all child promises if the parent promise is canceled', () => {
      expect.assertions(2);

      const cancelLoggers = jest.fn();

      const promise = CancelablePromise.race([
        new CancelablePromise<string>((_, __, { onCancel }) => {
          onCancel(() => {
            cancelLoggers();
          });
        }),
        new CancelablePromise<string>((_, __, { onCancel }) => {
          onCancel(() => {
            cancelLoggers();
          });
        }),
      ]);

      return promise.cancel().catch((error) => {
        expect(promise.status).toBe('canceled');
        expect(cancelLoggers).toBeCalledTimes(2);
      });
    });

    it('should cancel the parent promise if one of the child promises is canceled', () => {
      expect.assertions(2);

      const cancelLoggers = jest.fn();

      const promise = CancelablePromise.race([
        new CancelablePromise<string>((_, __, { onCancel }) => {
          onCancel(() => {
            cancelLoggers();
          });
        }),
        new CancelablePromise<string>((_, __, { onCancel, cancel }) => {
          onCancel(() => {
            cancelLoggers();
          });

          cancel();
        }),
      ]);

      return promise.cancel().catch((error) => {
        expect(promise.status).toBe('canceled');
        expect(cancelLoggers).toBeCalledTimes(2);
      });
    });
  });

  describe('CancelablePromise.resolve', () => {
    it('should resolve the promise', async () => {
      expect.assertions(1);

      const promise = CancelablePromise.resolve('result');

      const result = await promise;

      expect(result).toBe('result');
    });

    it('should not cancel a resolved promise', async () => {
      expect.assertions(3);

      const cancelLogger = jest.fn();
      const catchLogger = jest.fn();

      const promise = CancelablePromise.resolve('result').onCancel(() => {
        cancelLogger();
      });

      await promise.cancel().catch((error) => {
        catchLogger();
      });

      expect(cancelLogger).not.toBeCalled();
      expect(catchLogger).not.toBeCalled();
      expect(promise.status).toBe('resolved');
    });
  });

  describe('CancelablePromise.reject', () => {
    it('should reject the promise', async () => {
      expect.assertions(1);

      const promise = CancelablePromise.reject('error');

      await expect(promise).rejects.toBe('error');
    });

    it('should not cancel a rejected promise', async () => {
      expect.assertions(3);

      const cancelLogger = jest.fn();
      const catchLogger = jest.fn();

      const promise = CancelablePromise.reject('error').onCancel(() => {
        cancelLogger();
      });

      await promise.cancel().catch((error) => {
        catchLogger();
      });

      expect(cancelLogger).not.toBeCalled();
      expect(catchLogger).toBeCalled();
      expect(promise.status).toBe('rejected');
    });
  });

  describe('CancelablePromise.canceled', () => {
    it('should return a canceled promise', async () => {
      expect.assertions(2);

      const promise = CancelablePromise.canceled('canceled');

      await expect(promise).rejects.toEqual('canceled');
      expect(promise.status).toBe('canceled');
    });

    it('should not cancel a canceled promise', async () => {
      expect.assertions(3);

      const cancelLogger = jest.fn();
      const catchLogger = jest.fn();

      const promise = CancelablePromise.canceled().onCancel(() => {
        cancelLogger();
      });

      await promise.cancel().catch((error) => {
        catchLogger();
      });

      expect(cancelLogger).not.toBeCalled();
      expect(catchLogger).toBeCalled();
      expect(promise.status).toBe('canceled');
    });
  });
});
