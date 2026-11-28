export async function loadMonaco() {
  const [monaco] = await Promise.all([
    import('monaco-editor/editor/editor.api'),
    import('monaco-editor/languages/definitions/javascript/register'),
    import('monaco-editor/languages/definitions/typescript/register'),
    import('monaco-editor/language/typescript/monaco.contribution'),
  ]);

  return monaco;
}
