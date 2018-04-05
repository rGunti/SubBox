import { SubBoxServer } from "./server/server";
import { HandlebarsServerAppConfiguration } from "./server/handlebars";
import { I18NConfiguration } from "./server/serverbase";
import { Sequelize } from "sequelize-typescript";
import * as passport from "passport";
import * as YoutubeV3 from "passport-youtube-v3";
import { User } from "./db/User";
import { NextFunction } from "express";
import * as google from "googleapis";
import { OAuth2Client } from "google-auth-library";

class Startup {
    /**
     * Entry Point of this application
     */
    public static main(): number {
        // Configure Database Connection
        const sequelize = new Sequelize({
            database: 'subbox-dev',
            dialect: 'mysql',
            username: 'root',
            password: '',
            modelPaths: [__dirname + '/db']
        });

        // Configure Web Server
        const server: SubBoxServer = new SubBoxServer();
        const config: HandlebarsServerAppConfiguration = new HandlebarsServerAppConfiguration();
        config.Port = 1337;

        // Configure i18n
        config.UseI18N = true;
        config.I18NConfiguration = new I18NConfiguration();
        config.I18NConfiguration.updateFiles = true;
        config.I18NConfiguration.locales = [ "en", "de" ];
        config.I18NConfiguration.defaultLocale = "en";

        server.run(config);
        return 0;
    }
}

class ScratchMain {
    public static main():number {
        const config = {
            youtube: {
                clientID: '388670730727-2vtf8fdbu44if56v7hcv1mhi6u71f3na.apps.googleusercontent.com',
                clientSecret: '7pSOjpfJrKhNJXTpuv8G6t0D',
                callbackURL: 'http://127.0.0.1:1337/login/youtube'
            },
            database: {
                database: 'subbox-dev',
                dialect: 'mysql',
                username: 'root',
                password: '',
                modelPaths: [__dirname + '/db']
            }
        };
        const sequelize = new Sequelize(config.database);

        passport.serializeUser((user:User, done) => {
            done(null, user.id);
        });
        passport.deserializeUser((id:string|any, done) => {
            User.findOne({ where: { id: id } })
                .then((user) => {
                    done(null, user);
                })
                .catch((err) => {
                    done(err);
                })
        });
        passport.use(new YoutubeV3.Strategy({
            clientID: config.youtube.clientID,
            clientSecret: config.youtube.clientSecret,
            callbackURL: config.youtube.callbackURL,
            scope: ['https://www.googleapis.com/auth/youtube.readonly'],
            authorizationParams: {
                access_type : 'offline'
            }
        }, (accessToken:string, refreshToken:string, profile:any, done) => {
            process.nextTick(() => {
                User.findOne({ where: { id: profile.id } })
                    .then((user) => {
                        if (user) return done(null, user);
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
                        return done(err);
                    });
            });
        }));

        const userIsLoggedIn = (req:Request|any, res:Response|any, next:NextFunction) => {
            if (req.isAuthenticated()) return next();
            res.redirect('/login');
        };

        /* Express */
        const app = require('express')();
        app.use(require('express-session')({ secret: 'test' }));
        app.use(passport.initialize());
        app.use(passport.session());

        app.get('/login', passport.authenticate('youtube'));
        app.get('/login/youtube', passport.authenticate('youtube', {
            successRedirect: '/profile',
            failureRedirect: '/err'
        }));

        app.get('/profile', userIsLoggedIn, (req, res) => {
            let response:string = '';

            let oauthClient = new OAuth2Client(
                config.youtube.clientID,
                config.youtube.clientSecret,
                config.youtube.callbackURL
            );
            oauthClient.credentials = {
                access_token: req.user.accessToken,
                refresh_token: req.user.refreshToken
            };
            google.google.youtube({
                version: 'v3',
                auth: oauthClient
            }).subscriptions.list({
                part: 'snippet',
                mine: true
            }, function(err, data, response) {
                if (err) {
                    console.error('Error: ' + err);
                    res.json({
                        status: "error"
                    });
                }
                if (data && data.data) {
                    console.log(data.data);
                    res.json({
                        status: "ok",
                        data: data.data.items.map(i => {
                            return {
                                id: i.snippet.channelId,
                                name: i.snippet.title,
                                icon: i.snippet.thumbnails.high.url
                            }
                        })
                    });
                }
                if (response) {
                    console.log('Status code: ' + response.statusCode);
                }
            });
        });

        app.get('/', (req, res) => {
            res.send('Login at <a href="/login">/login</a>');
        });

        app.listen(1337);
        return 0;
    }
}

//Startup.main();
ScratchMain.main();
