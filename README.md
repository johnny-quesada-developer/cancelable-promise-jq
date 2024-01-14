# cancelable-promise-jq

![Image John Avatar](https://raw.githubusercontent.com/johnny-quesada-developer/global-hooks-example/main/public/avatar2.jpeg)

Hello and welcome to **cancelable-promise-jq**, a streamlined and efficient solution for managing asynchronous operations in JavaScript with the elegance of cancelable promises! 🌟

Asynchronous programming is a cornerstone of JavaScript development, and promises are its heartbeat. With **cancelable-promise-jq**, you elevate your coding experience by introducing the ability to cancel promises - a feature that adds a new layer of control and sophistication to your asynchronous logic.

Whether you're developing with vanilla **JavaScript**, **TypeScript**, or integrating with various JavaScript frameworks, **cancelable-promise-jq** offers you the tools to efficiently manage promise states like 'pending', 'resolved', 'rejected', or the unique 'canceled'. This library is not just about cancellation; it's about enhancing the way you handle asynchronous patterns in your applications.

Experience a new realm of possibility in promise handling with **cancelable-promise-jq**:

# What Does a CancelablePromise Look Like?

A cancelable promise looks just like a native promise, and, like the native promise, you can use it with async/await or with callbacks like then and catch.

```ts
const result = new CancelablePromise(
  (resolve, reject, { onCancel, reportProgress, cancel }) => {
    // ...your asynchronous code
  },
);
```

As you may notice, the first difference is that your promise constructor now receives an extra parameter with:

### **cancel: (reason?: unknown) => CancelablePromise<TResult>**

A method that allows you to cancel the promise from its inner scope

### **onCancel: (callback: TCancelCallback) => Subscription**

A method that allows you to subscribe to the cancel event of the promise, this is specially useful when you need to perform an specific action when the promise is canceled like aborting an http request, closing a socket, etc.

### **reportProgress: (percentage: number, metadata?: unknown) => void**

A method that allows you to report the progress of the promise, this is specially useful when you have an async operation that could take a long time and you want to report the progress to the user.

Let's take a look at the code:

```ts
const result = new CancelablePromise(
  async (resolve, reject, { onCancel, reportProgress, cancel }) => {
    const abortController = new CancelableAbortController();

    const request = fetch(
      'https://jsonplaceholder.typicode.com/todos/',
      abortController,
    );

    const unsubscribe = onCancel(() => {
      abortController.abort();
    });

    const results = await request;

    // the async process is not cancellable anymore
    unsubscribe();

    const todosById = await results.json().then((data) => {
      const total = data.length;
      const progressPerItem = 100 / total;

      return data.reduce((accumulator, item) => {
        accumulator[item.id] = item;

        reportProgress(progressPerItem);

        return accumulator;
      }, {});
    });

    // if you need you can cancel the promises it self whenever you want
    // cancel();

    resolve(todosById);
  },
)
  .then((result) => {
    console.log(`%cReady!!!`, 'color: blue; font-weight: bold;', result);
  })
  .onProgress((progress) => {
    console.log(`%ccomplete: ${progress}%`, 'color: blue; font-weight: bold;');
  })
  // .cancel() // you can also cancel the promise whenever you want from outside the promise
  .catch((error) => {
    // in case of error
  });
```

Cool, right? The same promise is in charge of handling its own cancellation policy and resource cleanup. Now, this promise is also capable of sending feedback, like progress updates on a task, to the entire hierarchy!! and of course, you can have various subscriptions to the **onCancel** callback to implement different resource release strategies or controls as your task progresses in a linear manner

```ts
const result = new CancelablePromise(
  async (resolve, reject, { onCancel, reportProgress, cancel }) => {
    // set resources

    let unsubscribe = onCancel(() => {
      // if somethings need to be cleaned up or released at this point
    });

    // dom something and wait for it to finish

    unsubscribe();

    // do something else

    // if something need to be cleaned up or released at this point
    // add a new onCancel listener
    unsubscribe = onCancel(() => {
      // ...
    });
  },
);
```

You can also add an onCancel listener from outside the promise body. The method for unsubscribing is similar to that used with the fetch **AbortController**

```ts
const abortController = new CancelableAbortController();

const result = new CancelablePromise((resolve, reject) => {
  // ... do something
})
  .onCancel((progress) => {}, abortController)
  .onProgress((progress) => {}, abortController);

// if your want to remove the callbacks listeners
abortController.abort();

// OR

// also removing specific listeners is super easy
const [_, unsubscribeProgress] = abortController.subscriptions;

unsubscribeProgress();
```

The AbortController is meant to be used just once, so after calling the abort method, all listeners will be removed (This is the native behavior of the **AbortController**)

# Don't wait any longer!

Unlock the full potential of promises in JavaScript with cancelable-promise-jq and revolutionize the way you approach asynchronous programming!

Don't just take our word for it; explore the capabilities yourself with detailed API documentation below. 🚀

For more information, see the documentation and examples below. You can also check out other libraries that implement cancelable promises, such as [easy-web-worker](https://www.npmjs.com/package/easy-web-worker) and [easy-threads-workers](https://www.npmjs.com/package/easy-threads-workers).

## CancelablePromise

CancelablePromise is a Promise that can be canceled. It is a Promise that has a status property that can be '`pending`', '`resolved`', '`rejected`' or '`canceled`'. It has an onCancel method that allows you to register a callback that will be called when the promise is canceled. It has a cancel method that allows you to cancel the promise.

### Examples:

```ts
const promise = new CancelablePromise((resolve, reject, utils) => {
  utils.cancel('canceled');
});

promise.catch((reason) => {
  console.log(reason); // 'canceled'
  console.log(promise.status); // 'canceled'
});
```

### Properties of a CancelablePromise

#### `status`

The status of the promise.

#### `Type`: **TPromiseStatus** ('pending' | 'resolved' | 'rejected' | 'canceled')

### Methods

`onCancel:`
Subscribe to the cancel event of the promise.

`onProgress`
Subscribe to the progress reports

`cancel`
Allows you to cancel the promise from outside the promise body

## createDecoupledPromise

Creates a decoupled promise, which allows you to create a CancelablePromise and control its resolution and rejection separately.

### Returns

An object with the following properties:

#### **promise**: A CancelablePromise that will be resolved or rejected based on the resolve and reject functions.

#### **resolve**: A function that can be used to resolve the promise.

#### **reject**: A function that can be used to reject the promise.

#### **cancel**: A function that can be used to cancel the promise.

#### **onCancel**: A function that can be used to subscribe to the cancel event of the promise.

### Example

```ts
import { createDecoupledPromise } from 'cancelable-promise-jq';

const { promise, resolve } = createDecoupledPromise<string>();

promise.then((result) => {
  console.log(result);
});

resolve('hello world');
// hello world
```

## toCancelablePromise

Converts a value to a CancelablePromise. The value can be a Promise, CancelablePromise, or a value.

### Parameters

#### **source**: The value to convert.

### Returns

A CancelablePromise that will be resolved with the value of the source.

### Example

```ts
import { toCancelablePromise } from 'cancelable-promise-jq';

const promise = new Promise((resolve) => {
  setTimeout(() => {
    resolve('hello world');
  }, 1000);
});

const cancelablePromise = toCancelablePromise(promise);

cancelablePromise.onCancel(() => {
  console.log('promise canceled');
});

cancelablePromise.cancel();
// promise canceled
```

## groupAsCancelablePromise

Groups a list of elements into a single CancelablePromise. The elements can be CancelablePromises, Promises, or values.

### Parameters

#### **sources**: The list of elements to group.

#### **config** (optional): An object containing the following options:

#### **maxConcurrent** (optional): The maximum number of elements to execute concurrently. Defaults to 8.

#### **executeInOrder** (optional): If true, the elements will be executed in order. Defaults to false.

#### **beforeEachCallback** (optional): A callback to execute before each element execution.

#### **afterEachCallback** (optional): A callback to execute after each element execution successfully. The callback will receive the result of the element execution.

#### **onQueueEmptyCallback** (optional): A callback to execute when the queue is empty. The callback will receive the result of the group execution.

### Returns

A CancelablePromise that will be resolved with the results of the elements in the group.

### Examples:

```ts
import { groupAsCancelablePromise } from 'cancelable-promise-jq';

const promise1 = new CancelablePromise((resolve) => {
  setTimeout(() => {
    resolve('hello');
  }, 1000);
});

const promise2 = new CancelablePromise((resolve) => {
  setTimeout(() => {
    resolve('world');
  }, 1000);
});

const cancelablePromise = groupAsCancelablePromise<string[]>([
  promise1,
  promise2,
]);

cancelablePromise.onCancel(() => {
  console.log('promise canceled');
});

cancelablePromise.cancel();
// promise canceled
```

This will create a CancelablePromise that will be resolved with an array containing the values 'hello' and 'world'. If the cancelablePromise is canceled, the console.log statement will be executed.

## isPromise

Checks if a value is a Promise.

### Parameters

#### **value**: The value to check.

### Returns

true if the value is a Promise, false otherwise.

Here is an example of using the isPromise function in TypeScript:

```ts
import { isPromise } from 'cancelable-promise-jq';

const promise = new Promise((resolve) => resolve());
console.log(isPromise(promise)); // true

const value = 'hello';
console.log(isPromise(value)); // false
```

This will print true for the promise variable and false for the value variable, as the promise variable is a Promise and the value variable is a string.

## tryCatch

Attempts to execute a callback and catch any errors that may occur during its execution.

### Parameters

#### **callback**: The callback to be executed.

#### **config** (optional): An object containing configuration options for the execution.

#### Configuration Options

#### **config.defaultResult** (optional): The default result to be returned if the callback throws an error. Defaults to null.

#### **config.exceptionHandlingType** (optional): The type of log to be used when an error occurs. Possible values are 'error', 'warn', and 'ignore'. Defaults to 'error'.

### Returns

An object with the following properties:

#### **error**: The error that occurred during the execution of the callback, or null if no error occurred.

#### **result**: The result of the callback, or the default result if an error occurred.

### Example:

```ts
import { tryCatch } from 'cancelable-promise-jq';

const { error, result } = tryCatch(() => {
  throw new Error('Error');
});

console.log(error); // Error: Error
console.log(result); // null

const { error, result } = tryCatch(() => {
  return 'result';
});

console.log(error); // null
console.log(result); // result
```

## tryCatchPromise

Attempts to execute an async callback or promise and catch any errors that may occur during its execution.

### Parameters

source: The async callback or promise to be handled.
config (optional): An object containing configuration options for the execution.

#### Configuration Options:

#### **ignoreCancel** (optional): If true, errors caused by canceling the promise will be ignored. Defaults to true.

#### **defaultResult** (optional): The default result to be returned if the promise is rejected. Defaults to null.

#### **exceptionHandlingType** (optional): The type of log to be used when the promise is rejected. Possible values are 'error', 'warn', and 'ignore'. Defaults to 'error', and 'ignore' for canceled promises if ignoreCancel is true.

### Returns

A CancelablePromise that resolves to an object with the following properties:

**error**: The error that occurred during the execution of the promise, or null if no error occurred.
**result**: The result of the promise, or the default result if an error occurred.
**promise**: The original CancelablePromise that was passed as the source.

### Example

```ts
import { tryCatchPromise } from 'cancelable-promise-jq';

const { error, result, promise } = await tryCatchPromise(async () => {
  throw new Error('Error');
});

console.log(error); // Error: Error
console.log(result); // null
console.log(promise.status); // canceled
```

# Contributing

We welcome contributions to cancelable-promise-jq! If you have an idea for a new feature or improvement, please open an issue or submit a pull request.

# License

cancelable-promise-jq is released under the MIT License.
