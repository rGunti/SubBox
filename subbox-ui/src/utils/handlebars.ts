let helpers = {
    currentYear: () => { return new Date().getFullYear(); }
};

export class HandlebarHelpers {
    public static register(hbs: any) {
        for (let helperName in helpers) {
            console.log(` - Registering HBS Helper ${helperName}`);
            hbs.registerHelper(helperName, helpers[helperName]);
        }
    }
}
