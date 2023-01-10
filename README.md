# cancelable-promise-jq

A utility for creating cancelable promise

# Introduction

**cancelable-promise-jq** is a lightweight library that helps you manage and organize asynchronous callbacks in your JavaScript code. It provides a simple interface for registering and triggering callbacks, as well as managing their execution order.

# API Documentation

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

### Parameters

#### **callback** (TCancelablePromiseCallback<TResult>): the callback of the promise, it will receive the resolve, reject and cancel functions.

### Properties

#### `status`

The status of the promise.

#### `Type`: **TPromiseStatus** ('pending' | 'resolved' | 'rejected' | 'canceled')

### Methods

`onCancel:`
Subscribe to the cancel event of the promise.

`Parameters:`
callback (TCancelCallback): the callback to be called when the promise is canceled.

### Returns

The promise itself.

Type: CancelablePromise`<TResult>`

`cancel`
Cancel the promise and all the chained promises.

#### Parameters

reason (unknown): the reason of the cancellation.
Returns
The promise itself.

Type: CancelablePromise<TResult>

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
