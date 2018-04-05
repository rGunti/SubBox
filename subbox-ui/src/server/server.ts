import { Server, ServerApp, ServerAppConfiguration } from './serverbase';
import { Application, Router, NextFunction, Request, Response } from 'express';
import * as express from 'express';
import { HandlebarsServerAppConfiguration, HandlebarsEngineConfiguration, HandlebarsServerApp } from './handlebars';
import { IndexRoute } from '../routes/index';
import * as passport from 'passport';
import { Strategy } from 'passport-youtube-v3';
import * as session from 'express-session';
import { AuthRoutes } from '../routes/auth';
import { access } from 'fs';
import { User } from '../db/User';

export class SubBoxServer extends Server<HandlebarsServerAppConfiguration, SubBoxServerApp> {
    protected initializeApp(): SubBoxServerApp {
        let app: SubBoxServerApp = new SubBoxServerApp();
        return app;
    }
}

export class SubBoxServerApp extends HandlebarsServerApp {
    protected configure(app: express.Application, config: HandlebarsServerAppConfiguration): void {
        let self = this;
        passport.serializeUser((user, done) => this.serializeUser);
        passport.deserializeUser((id, done) => this.deserializeUser);

        // TODO: Config
        passport.use(new Strategy({
            clientID: '388670730727-2vtf8fdbu44if56v7hcv1mhi6u71f3na.apps.googleusercontent.com',
            clientSecret: '7pSOjpfJrKhNJXTpuv8G6t0D',
            callbackURL: 'http://127.0.0.1:1337/login/youtube',
            scope: ['https://www.googleapis.com/auth/youtube.readonly']
        }, (accessToken, refreshToken, profile, done) => {
            self.login(accessToken, refreshToken, profile, done);
        }));
        app.use(session({ secret: 'somesecret' }));
        app.use(passport.initialize());
        app.use(passport.session());
        super.configure(app, config);
    }
    
    protected configureRoutes(app: Application, config: HandlebarsServerAppConfiguration) {
        new IndexRoute().setup(app, "/");
        new AuthRoutes().setup(app, "/login");
    }

    private loggedInUsers:MemoryUser[] = [];
    private serializeUser(user:User|any, done:Function) {
        done(null, user.id);
    }

    private deserializeUser(id:string|any, done:Function) {
        User.findOne({ where: { id: id } })
            .then((user) => {
                done(null, user);
            })
            .catch((err) => {
                done(err, null);
            });
    }

    private login(accessToken:string, refreshToken:string, profile:any, done:Function) {
        User.findOne({ where: { id: profile.id } })
            .then((user) => {
                if (user) {
                    return done(null, user);
                }
                user = new User({
                    id: profile.id,
                    displayName: profile.displayName,
                    accessToken: accessToken,
                    refreshToken: refreshToken
                });
                user.save()
                    .then((user) => done(null, user))
                    .catch((err) => done(err));
            })
            .catch((err) => {
                done(err);
            });
    }
}

export interface MemoryUser {
    id:string;
    accessToken:string;
    refreshToken:string;
    name:string;
}
