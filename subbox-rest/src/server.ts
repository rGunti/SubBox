import { Server, createServer } from "http";
import * as express from "express";
import * as logger from "morgan";
import * as bodyparser from "body-parser";
import { AllRoutes } from "./routes/allroutes";

export class SubboxRestServer {
    private app: express.Application;
    private httpServer: Server;

    /**
     * Initializes a new Subbox REST-API Server using a given
     * Express Server Application
     */
    constructor(app:express.Application) {
        this.app = app;
    }

    /**
     * Returns the underlying Express Application
     */
    get ServerApp():express.Application {
        return this.app;
    }

    /**
     * Starts the server and awaits inbound connections
     * @param port Port where the server will run on (default: 3000, should be populated with Config value)
     */
    public run(port:number = 3000) {
        const self = this;

        self.app
            .use(logger('dev'))
            .use(bodyparser.json())
            .use(bodyparser.urlencoded({ extended: true }));
        
        AllRoutes.forEach(route => route.apply(self.app));

        const server:Server = createServer(self.app);
        server.on("error", (err) => self.onInitError);
        server.on("listening", () => self.onListening);
        server.listen(port);
        
        self.httpServer = server;
    }

    /**
     * Executes when an error occurres while initializing the server
     * @param error Error detail
     */
    protected onInitError(error: Error|any): void {
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

    /**
     * Executes once initialization has been completed successfully
     */
    protected onListening(): void {
        let addr = this.httpServer.address();
        let bind: string = typeof addr === "string"
            ? "Pipe " + addr
            : "Port " + addr.port;
        console.log("Listening on %s", bind);
    }
}