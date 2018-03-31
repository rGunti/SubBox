import { HandlebarsRoute, HandlebarsRenderOptions } from "./baseroute";
import { Request, Response, NextFunction, Router } from "express";

export class IndexRoute extends HandlebarsRoute {
    protected setupRoutes(router: Router): Router {
        router.get("/", (req, res, next) => { new IndexRoute().index(req, res, next); });
        router.get("/hello", (req, res, next) => { new IndexRoute().helloWorldJson(req, res, next); });
        return router;
    }

    index (req: Request|any, res: Response, next: NextFunction) {
        this.renderPage(req, res, "index", HandlebarsRenderOptions.newWithTitle(req.__("hello.world")));
    }

    helloWorldJson(req: Request|any, res: Response, next: NextFunction) {
        this.sendJson(req, res, null, {
            hello: "world",
            translated: req.__("hello.world.json"),
            meaning: 42
        });
    }
}