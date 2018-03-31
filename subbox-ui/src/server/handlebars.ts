import * as express from 'express';
import * as hbs from 'express-hbs';
import * as hbsHelpers from 'handlebars-helpers';
import * as i18n from 'i18n';
import { HandlebarHelpers } from '../utils/handlebars';
import { ServerApp, ServerAppConfiguration, StaticDirectoryMapping } from "./serverbase";
import { join } from 'path';

export abstract class HandlebarsServerApp extends ServerApp<HandlebarsServerAppConfiguration> {
    protected configureViewEngine(app: express.Application, config: HandlebarsServerAppConfiguration): void {
        app.set('views', config.ViewsDir);

        let hbsEngine = hbs.express4(config.HandlebarsConfig);
        hbsHelpers({ handlebars: hbs.handlebars });
        HandlebarHelpers.register(hbs.handlebars);
        app.engine('hbs', hbsEngine);
        app.set('view engine', 'hbs');

        if (config.UseI18N) {
            hbs.handlebars.registerHelper('__', function() { return i18n.__.apply(this, arguments); });
            hbs.handlebars.registerHelper('__n', function() { return i18n.__n.apply(this, arguments); });
        }
    }
}

export class HandlebarsServerAppConfiguration extends ServerAppConfiguration {
    // Static Files
    public StaticFiles: StaticDirectoryMapping[] = [
        new StaticDirectoryMapping(__dirname + "/../../public", "/public"),
        new StaticDirectoryMapping(__dirname + "/../../node_modules/jquery/dist", "/public/js"),
        new StaticDirectoryMapping(__dirname + "/../../node_modules/material-design-lite/dist", "/public/js"),
        new StaticDirectoryMapping(__dirname + "/../../node_modules/moment/min", "/public/js"),
        new StaticDirectoryMapping(__dirname + "/../../node_modules/moment-duration-format/lib", "/public/js"),
        new StaticDirectoryMapping(__dirname + "/../../node_modules/material-design-icons-iconfont/dist", "/public/css"),
        new StaticDirectoryMapping(__dirname + "/../../node_modules/font-awesome", "/public"),
        new StaticDirectoryMapping(__dirname + "/../../node_modules/typeface-roboto", "/public/css/typeface-roboto")
    ];

    // HBS
    public HandlebarsConfig: HandlebarsEngineConfiguration = new HandlebarsEngineConfiguration();
    public ViewsDir: string = join(__dirname, "..", "..", "views");
}

export class HandlebarsEngineConfiguration {
    public defaultLayout: string = join(__dirname, "..", "..", "views", "layouts", "main.hbs");
    public partialsDir: string = join(__dirname, "..", "..", "views", "partials");
    public layoutsDir: string = join(__dirname, "..", "..", "views", "layouts");
}
