import { createRoot } from 'https://esm.sh/react-dom@18/client';
import App from './App.js';
document.addEventListener('DOMContentLoaded', () => {
    const root = document.getElementById('root');
    if (root) {
        createRoot(root).render(React.createElement(App, null));
    }
});
