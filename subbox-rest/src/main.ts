import { SubboxRestServer } from "./server";
import * as config from "config";
import * as express from "express";

class Startup {
    public static main(args:string[] = []): void {
        const server = new SubboxRestServer(express());
        server.run(config.get('server.port'));
    }
}

Startup.main(process.argv.slice(2));
