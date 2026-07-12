import './mockChrome';
import { createApp } from 'vue';
import Popup from '../src/components/Popup.vue';
import Options from '../src/components/Options.vue';
import '../src/style.css';

createApp(Popup).mount('#popup');
createApp(Options).mount('#options');
