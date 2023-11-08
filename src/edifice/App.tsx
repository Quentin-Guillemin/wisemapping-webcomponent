import CustomRESTPersistenceManager from './CustomRESTPersistenceManager';
import MapInfoImpl from './MapInfoImpl';
import Editor, { Designer, EditorOptions, MapInfo, PersistenceManager, useEditor } from '@edifice-wisemapping/editor';
import { ReactElement } from 'react';

const App = (): ReactElement => {
  let mapInfo: MapInfo, options: EditorOptions, persistenceManager: PersistenceManager;

  mapInfo = new MapInfoImpl('2', 'Develop Map Title', false);
  options = {
    mode: 'edition-owner',
    locale: 'fr',
    enableKeyboardEvents: true,
  };
  persistenceManager = new CustomRESTPersistenceManager({
    documentUrl: '/quentin/api/file/{id}',
  });

  const editor = useEditor({ mapInfo, options, persistenceManager });

  const initialization = (designer: Designer) => {
    designer.addEvent('loadSuccess', () => {
      const elem = document.getElementById('mindmap-comp');
      if (elem) {
        elem.classList.add('ready');
      }
    });
  };

  return <Editor editor={editor} onLoad={initialization} />;
};

export default App;
