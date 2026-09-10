import { openOrFocusApp } from './src/openApp';

const openButton = document.getElementById('open-app');

openButton?.addEventListener('click', () => {
  void openOrFocusApp().then(() => window.close());
});
