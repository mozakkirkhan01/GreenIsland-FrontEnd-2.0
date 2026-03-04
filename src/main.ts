import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';
import $ from 'jquery';

(window as any).$ = $;
(window as any).jQuery = $;
bootstrapApplication(App, appConfig)
  .catch((err) => console.error(err));
