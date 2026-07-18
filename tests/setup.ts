// Keep the shared test setup minimal.
// Some browser and jsdom helpers may touch canvas APIs, which jsdom does not
// implement by default. A null context is sufficient for the host tests.
if (typeof HTMLCanvasElement !== 'undefined') {
  HTMLCanvasElement.prototype.getContext = function getContext(): null {
    return null;
  };
}

export {};
