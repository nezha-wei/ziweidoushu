/** 应用入口：加载设计系统样式并挂载应用。 */
import './styles/tokens.css';
import './styles/base.css';
import './styles/layout.css';
import './styles/components.css';
import './styles/animations.css';
import { mountApp } from './ui/app';

const root = document.getElementById('app');
if (root) mountApp(root);