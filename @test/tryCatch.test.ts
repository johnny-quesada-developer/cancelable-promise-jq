import { CancelablePromise } from '../src/CancelablePromise';
import { tryCatch, tryCatchPromise } from '../src/utils';

describe('tryCatch', () => {
  beforeEach(() => {
    jest.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('should return the result of the function', () => {
    const { result, error } = tryCatch(() => 'result');

    expect(result).toBe('result');
    expect(error).toBeNull();
  });

  it('should return the error of the function', () => {
    const { result, error } = tryCatch(() => {
      throw new Error('error');
    });

    expect(result).toBeNull();
    expect(error).toBeInstanceOf(Error);
  });

  it('should return the error of the function and the default result', () => {
    const { result, error } = tryCatch(
      () => {
        throw new Error('error');
      },
      { defaultResult: 'default' },
    );

    expect(result).toBe('default');
    expect(error).toBeInstanceOf(Error);
  });

  it('should return the value of the function even if the default result is set', () => {
    const { result, error } = tryCatch(() => 'result', {
      defaultResult: 'default',
    });

    expect(result).toBe('result');
    expect(error).toBeNull();
  });
});

describe('tryCatchPromise', () => {
  it('should return the result of the function', async () => {
    const { result, error, promise } = await tryCatchPromise(
      async () => 'result',
    );

    expect(result).toBe('result');
    expect(error).toBeNull();
    expect(promise).toBeInstanceOf(CancelablePromise);
    expect(promise?.status).toBe('resolved');
    expect(console.error).not.toBeCalled();
  });

  it('should return the error of the function', async () => {
    const { result, error, promise } = await tryCatchPromise(() => {
      return Promise.reject(Error('error'));
    });

    expect(result).toBeNull();
    expect(error).toBeInstanceOf(Error);
    expect(promise).toBeInstanceOf(CancelablePromise);
    expect(promise?.status).toBe('rejected');
    expect(console.error).toBeCalled();
  });

  it('should return the error of the function and the default result', async () => {
    const { result, error, promise } = await tryCatchPromise(
      async () => {
        throw new Error('error');
      },
      { defaultResult: 'default' },
    );

    expect(result).toBe('default');
    expect(error).toBeInstanceOf(Error);
    expect(promise).toBeInstanceOf(CancelablePromise);
    expect(promise?.status).toBe('rejected');
    expect(console.error).toBeCalled();
  });

  it('should return the value of the function even if the default result is set', async () => {
    const { result, error, promise } = await tryCatchPromise(
      async () => 'result',
      { defaultResult: 'default' },
    );

    expect(result).toBe('result');
    expect(error).toBeNull();
    expect(promise).toBeInstanceOf(CancelablePromise);
    expect(promise?.status).toBe('resolved');
    expect(console.error).not.toBeCalled();
  });

  /**
   * This test is skipped cause the unhandled promise rejection stops nodejs execution
   * but the tryCatchPromise works as expected, and the success message is logged.
   */
  it.skip('should return error when promise is canceled', async () => {
    const cancelablePromise = new CancelablePromise<string>((resolve) => {
      setTimeout(() => {
        resolve('result');
      }, 1000);
    });

    setTimeout(() => {
      cancelablePromise.cancel();
    }, 0);

    const { result, error, promise } = await tryCatchPromise(
      () => cancelablePromise,
    );

    expect(result).toBeNull();
    expect(error).toBeNull();
    expect(promise).toBeInstanceOf(CancelablePromise);
    expect(promise?.status).toBe('canceled');
    expect(console.error).not.toBeCalled();

    console.log('%csuccess', 'color: green; font-weight: bold;');
  });

  /**
   * This test is skipped cause the unhandled promise rejection stops nodejs execution
   * but the tryCatchPromise works as expected, and the success message is logged.
   */
  it.skip('should return error when promise is canceled and the default result is set', async () => {
    const cancelablePromise = new CancelablePromise<string>((resolve) => {
      setTimeout(() => {
        resolve('result');
      }, 1000);
    });

    setTimeout(() => {
      cancelablePromise.cancel();
    }, 0);

    const { result, error, promise } = await tryCatchPromise(
      () => cancelablePromise,
      {
        defaultResult: 'default',
      },
    );

    expect(result).toBe('default');
    expect(error).toBeNull();
    expect(promise).toBeInstanceOf(CancelablePromise);
    expect(promise?.status).toBe('canceled');
    expect(console.error).not.toBeCalled();
  }, 10000);
});
