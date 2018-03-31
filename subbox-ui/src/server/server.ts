import { Server, ServerApp, ServerAppConfiguration } from './serverbase';
import { Application, Router, NextFunction, Request, Response } from 'express';
import * as express from 'express';
import { HandlebarsServerAppConfiguration, HandlebarsEngineConfiguration, HandlebarsServerApp } from './handlebars';
import { IndexRoute } from '../routes/index';

export class MyServer extends Server<HandlebarsServerAppConfiguration, MyServerApp> {
    protected initializeApp(): MyServerApp {
        let app: MyServerApp = new MyServerApp();
        return app;
    }
}

export class MyServerApp extends HandlebarsServerApp {
    protected configureRoutes(app: Application, config: HandlebarsServerAppConfiguration) {
        new IndexRoute().setup(app, "/");
    }
}
