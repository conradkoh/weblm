/**
 * WebLM — Local-first AI chat powered by Gemma via WebLLM.
 *
 * Entry point. Mounts the Svelte application.
 */

import './app.css';
import { mount } from 'svelte';
import App from './App.svelte';

const target = document.getElementById('app');
if (!target) {
  throw new Error('App container #app not found');
}

mount(App, { target });
