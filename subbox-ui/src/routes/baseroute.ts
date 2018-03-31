import { NextFunction, Request, Response, Router, Application } from 'express';
import * as express from 'express';

export abstract class BaseRoute {
    constructor() {
    }

    public setup(app: Application, baseRoute: string): void {
        app.use(baseRoute, this.setupRoutes(express.Router()));
    }
    protected abstract setupRoutes(router: Router): Router;

    protected sendJson(req: Request, res: Response, error?: Error|any, data?: any) {
        if (error) res.status(error.status || 500);
        res.json({
            ok: !error,
            data: data,
            error: error
        });
    }
}

export abstract class HandlebarsRoute extends BaseRoute {
    protected renderPage(req: Request, res: Response, view: string, options?: HandlebarsRenderOptions): void {
        res.render(view, options);
    }
}

export class HandlebarsRenderOptions {
    constructor(pageTitle?: string, data?: any) {
        this.pageTitle = pageTitle;
        this.data = data;
    }

    public static newWithTitle(title: string): HandlebarsRenderOptions {
        return new HandlebarsRenderOptions(title);
    }
    public static newWithTitleAndData(title: string, data: any): HandlebarsRenderOptions {
        return new HandlebarsRenderOptions(title, data);
    }

    public pageTitle: string;
    public data: any;
}