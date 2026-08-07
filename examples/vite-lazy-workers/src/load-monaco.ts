export async function loadMonaco() {
  const [monaco] = await Promise.all([
    import('monaco-editor/editor/editor.api'),
    import('monaco-editor/language/typescript/monaco.contribution'),
  ]);

  return monaco;
}
