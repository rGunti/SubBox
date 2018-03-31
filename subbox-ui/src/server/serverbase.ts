import * as express from 'express';
import * as bodyParser from 'body-parser';
import * as cookieParser from 'cookie-parser';
import * as errorhandler from 'errorhandler';
import * as logger from 'morgan';
import * as http from 'http';
import * as i18n from 'i18n';
import { fail } from 'assert';
import { join } from 'path';

export abstract class Server<TConfig extends ServerAppConfiguration, TApp extends ServerApp<TConfig>> {
    protected serverApp: TApp;
    protected httpServer: http.Server;

    constructor() {
        this.serverApp = this.initializeApp();
    }

    protected abstract initializeApp(): TApp;

    public run(config: TConfig): void {
        let self = this;
        this.serverApp.configureApp(config);
        let server = this.serverApp.createServer();
        server.on("error", (error: any) => { self.onError(error) });
        server.on("listening", () => { self.onListening() });
        server.listen(config.Port);
        this.httpServer = server;
    }

    protected onError(error: any): void {
        if (error.syscall !== "listen") {
            throw error;
        }

        switch (error.code) {
            case "EACCES":
                console.error("Cannot startup server because binding requires elevated privileges.");
                process.exit(1000);
                break;
            case "EADDRINUSE":
                console.error("Requested Binding is already in use.");
                process.exit(1001);
                break;
            default:
                throw error;
        }
    }

    protected onListening(): void {
        let addr = this.httpServer.address();
        let bind: string = typeof addr === "string"
            ? "Pipe " + addr
            : "Port " + addr.port;
        console.log("Listening on %s", bind);
    }
}

export abstract class ServerApp<TConfig extends ServerAppConfiguration> {
    protected app: express.Application;

    constructor() {
        this.app = express();
    }

    public configureApp(config?: TConfig): express.Application {
        this.configure(this.app, config);
        return this.app;
    }

    protected configure(app: express.Application, config: TConfig): void {
        app.use(logger('dev'));

        app.use(bodyParser.json());
        app.use(bodyParser.urlencoded({ extended: true }));

        if (config.UseCookieParser) {
            app.use(cookieParser(config.CookieParserKey));
        }
        if (config.UseI18N) {
            i18n.configure(config.I18NConfiguration);
            app.use(i18n.init);
        }

        config.StaticFiles.forEach(e => {
            e.apply(app);
        });

        this.configureViewEngine(app, config);
        this.configureRoutes(app, config);
        this.configureErrorRoutes(app, config);
    }

    protected abstract configureViewEngine(app: express.Application, config: TConfig): void;
    protected abstract configureRoutes(app: express.Application, config: TConfig): void;

    protected configureErrorRoutes(app: express.Application, config: TConfig): void {
        app.use(function(err: any, req: express.Request, res: express.Response, next: express.NextFunction) {
            err.status = 404;
            next(err);
        });
        app.use(errorhandler());
    }

    public createServer(): http.Server {
        return http.createServer(this.app);
    }
}

export class ServerAppConfiguration {
    public Port: number = 8080;
    
    // Cookie Parser
    public UseCookieParser: boolean = true;
    public CookieParserKey: string = "ThisIsATestKeyAndShouldBeOverwritten";

    // Static Files
    public StaticFiles: StaticDirectoryMapping[] = [
        new StaticDirectoryMapping(__dirname + "/../../public", "/public"),
        new StaticDirectoryMapping(__dirname + "/../../node_modules/jquery/dist", "/public/js"),
        new StaticDirectoryMapping(__dirname + "/../../node_modules/bootstrap/dist", "/public"),
        new StaticDirectoryMapping(__dirname + "/../../node_modules/moment/min", "/public/js"),
        new StaticDirectoryMapping(__dirname + "/../../node_modules/moment-duration-format/lib", "/public/js"),
        new StaticDirectoryMapping(__dirname + "/../../node_modules/font-awesome", "/public")
    ];

    // i18n
    public UseI18N: boolean = false;
    public I18NConfiguration: I18NConfiguration;
}

export class StaticDirectoryMapping {
    constructor(source: string, route: string) {
        this.DirectorySource = source;
        this.Route = route;
    }

    public DirectorySource: string;
    public Route: string;

    public apply(app: express.Application) {
        console.log(" - Applying \"%s\" to Route \"%s\"", this.DirectorySource, this.Route);
        app.use(this.Route, express.static(this.DirectorySource));
    }
}

export class I18NConfiguration {
    public locales: string[];
    public fallbacks: Object;
    public defaultLocale: string;
    public cookie: string = "locale";
    public queryParameter: string = "lang";
    public directory: string = join(__dirname, "..", "..", "i18n");
    public autoReload: boolean = true;
    public updateFiles: boolean = false;
}
