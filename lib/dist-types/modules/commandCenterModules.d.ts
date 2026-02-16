export type CommandCenterModuleId = "body" | "training" | "nutrition" | "recovery" | "labs" | "settings";
export type CommandCenterModule = {
    id: CommandCenterModuleId;
    title: string;
    subtitle?: string;
    href: string;
};
export declare const COMMAND_CENTER_MODULES: readonly CommandCenterModule[];
//# sourceMappingURL=commandCenterModules.d.ts.map