import { MyServer } from "./server/server";
import { HandlebarsServerAppConfiguration } from "./server/handlebars";
import { I18NConfiguration } from "./server/serverbase";

class Startup {
    /**
     * Entry Point of this application
     */
    public static main(): number {
        let server: MyServer = new MyServer();
        let config: HandlebarsServerAppConfiguration = new HandlebarsServerAppConfiguration();

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

Startup.main();
