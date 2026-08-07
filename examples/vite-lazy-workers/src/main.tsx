import { createIsland } from '@askrjs/askr/boot';

import { MonacoEditor } from '../../../src';
import { loadMonaco } from './load-monaco';
import './monaco-workers';

const root = document.querySelector<HTMLElement>('#app');

if (!root) {
  throw new Error('Expected an #app mount point');
}

createIsland({
  root,
  component: () => (
    <MonacoEditor
      defaultValue="const answer = 42;"
      language="typescript"
      loadMonaco={loadMonaco}
      options={{ automaticLayout: true, minimap: { enabled: false } }}
      style={{ height: '100vh' }}
    />
  ),
});
