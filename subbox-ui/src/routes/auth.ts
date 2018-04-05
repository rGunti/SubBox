import { HandlebarsRoute, HandlebarsRenderOptions } from "./baseroute";
import { Request, Response, NextFunction, Router } from "express";
import * as passport from 'passport';

export class AuthRoutes extends HandlebarsRoute {
    protected setupRoutes(router: Router): Router {
        router.get('/', passport.authenticate('youtube'));
        router.get('/youtube', passport.authenticate('youtube', {
            //successRedirect: '/',
            failureRedirect: '/error'
        }), (req, res, next) => {
            res.redirect('/');
        });
        return router;
    }
}

export function userLoggedIn(req: Request|any, res: Response|any, next:NextFunction) {
    if (req.isAuthenticated())
        return next();
    res.redirect('/login');
}