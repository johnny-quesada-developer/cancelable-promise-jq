interface EventListener {
  (evt: Event): void;
}

interface EventListenerObject {
  handleEvent(object: Event): void;
}

interface EventListenerOptions {
  capture?: boolean;
}

interface AddEventListenerOptions extends EventListenerOptions {
  /** When `true`, the listener is automatically removed when it is first invoked. Default: `false`. */
  once?: boolean;
  /** When `true`, serves as a hint that the listener will not call the `Event` object's `preventDefault()` method. Default: false. */
  passive?: boolean;
}

export type TRemoveEventListener = () => void;

export interface CancelableAbortSignal extends AbortSignal {
  subscribe(
    listener: EventListener | EventListenerObject,
    options?: AddEventListenerOptions | boolean,
  ): TRemoveEventListener;
  subscribe(
    type: string,
    listener: EventListener | EventListenerObject,
    options?: AddEventListenerOptions | boolean,
  ): TRemoveEventListener;
}

export class CancelableAbortController extends AbortController {
  private _subscriptions: Set<TRemoveEventListener> = new Set();

  public get subscriptions() {
    return Array.from(this._subscriptions);
  }

  public signal: CancelableAbortSignal;

  constructor() {
    super();

    this.signal.subscribe = (...args: unknown[]) => {
      const [arg1, arg2, arg3] = args;

      const type = typeof arg1 === 'string' ? arg1 : 'abort';

      const listener = (typeof arg1 === 'string' ? arg2 : arg1) as
        | EventListener
        | EventListenerObject;

      const options = (typeof arg1 === 'string' ? arg3 : arg2) as
        | AddEventListenerOptions
        | boolean;

      this.signal.addEventListener(type, listener, options);

      const removeEventListener = () => {
        this.signal.removeEventListener(type, listener, options);
      };

      this._subscriptions.add(removeEventListener);

      return removeEventListener;
    };
  }

  /**
   * Abort and reset the controller.
   */
  abort() {
    super.abort();
    this._subscriptions = new Set();
  }

  dispose() {
    this._subscriptions.forEach((subscription) => subscription());
    this._subscriptions = null;
  }
}
