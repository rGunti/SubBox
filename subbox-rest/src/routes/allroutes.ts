import { Router, Application } from "express";

import { TemplateRouter } from "./template";

export class ServerRoutingOptions {
    router:Router;
    basePath:string;

    constructor(router:Router, basePath:string = null) {
        this.router = router;
        this.basePath = basePath;
    }

    public apply(app:Application) {
        if (this.basePath) app.use(this.basePath, this.router);
        else app.use(this.router);
    }
}

// List all routes, which should be exported, here
export const AllRoutes: ServerRoutingOptions[] = [
    new ServerRoutingOptions(TemplateRouter, '/test')
];
