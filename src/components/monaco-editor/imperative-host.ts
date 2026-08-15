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

  if (node === null) {
    // Askr can detach a callback ref transiently while reconciling the same
    // component. The component task cleanup owns real unmount disposal.
    return false;
  }

  owner.host = node;

  if (previousHost !== null && previousHost !== node) {
    disposeForHostChange();
  }

  return true;
}
