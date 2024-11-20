import wrapNativePostgresCallAsync from '../wrapNativePostgresCallAsync';

describe(wrapNativePostgresCallAsync, () => {
  it('rethrows literals', async () => {
    const throwingFn = async (): Promise<void> => {
      // eslint-disable-next-line no-throw-literal,@typescript-eslint/only-throw-error
      throw 'hello';
    };

    let capturedThrownThing: any;
    try {
      await wrapNativePostgresCallAsync(throwingFn);
    } catch (e) {
      capturedThrownThing = e;
    }
    expect(capturedThrownThing).not.toBeInstanceOf(Error);
    expect(capturedThrownThing).toEqual('hello');
  });
});
