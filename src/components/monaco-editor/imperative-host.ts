type ImperativeHostOwner<Host> = {
  host: Host | null;
};

/** @internal Keeps Monaco's imperative host lifecycle separate from JSX refs. */
export function updateImperativeHost<Host>(
  owner: ImperativeHostOwner<Host>,
  node: Host | null,
  disposeForHostChange: () => void
): boolean {
  const previousHost = owner.host;
  owner.host = node;

  if (node === null) {
    disposeForHostChange();
    return false;
  }

  if (previousHost !== null && previousHost !== node) {
    disposeForHostChange();
  }

  return true;
}
