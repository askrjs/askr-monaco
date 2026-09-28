import EditorWorker from 'monaco-editor/editor/editor.worker?worker';
import TypeScriptWorker from 'monaco-editor/language/typescript/ts.worker?worker';

export function configureMonacoWorkers() {
  self.MonacoEnvironment = {
    getWorker(_moduleId, label) {
      if (label === 'javascript' || label === 'typescript') {
        return new TypeScriptWorker();
      }

      return new EditorWorker();
    },
  };
}
