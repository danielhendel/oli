export type ModuleId = "body" | "workouts" | "nutrition" | "recovery" | "labs" | "settings";
export type ModuleSection = {
    id: string;
    moduleId: ModuleId;
    title: string;
    href: string;
};
export declare const MODULE_SECTIONS: readonly [{
    readonly id: "body.overview";
    readonly moduleId: "body";
    readonly title: "Overview";
    readonly href: "/(app)/body/overview";
}, {
    readonly id: "body.weight";
    readonly moduleId: "body";
    readonly title: "Weight";
    readonly href: "/(app)/body/weight";
}, {
    readonly id: "body.dexa";
    readonly moduleId: "body";
    readonly title: "DEXA";
    readonly href: "/(app)/body/dexa";
}, {
    readonly id: "workouts.overview";
    readonly moduleId: "workouts";
    readonly title: "Overview";
    readonly href: "/(app)/workouts/overview";
}, {
    readonly id: "workouts.log";
    readonly moduleId: "workouts";
    readonly title: "Log Workout";
    readonly href: "/(app)/workouts/log";
}, {
    readonly id: "workouts.history";
    readonly moduleId: "workouts";
    readonly title: "History";
    readonly href: "/(app)/workouts/history";
}, {
    readonly id: "nutrition.overview";
    readonly moduleId: "nutrition";
    readonly title: "Overview";
    readonly href: "/(app)/nutrition/overview";
}, {
    readonly id: "nutrition.log";
    readonly moduleId: "nutrition";
    readonly title: "Log Nutrition";
    readonly href: "/(app)/nutrition/log";
}, {
    readonly id: "nutrition.targets";
    readonly moduleId: "nutrition";
    readonly title: "Targets";
    readonly href: "/(app)/nutrition/targets";
}, {
    readonly id: "recovery.overview";
    readonly moduleId: "recovery";
    readonly title: "Overview";
    readonly href: "/(app)/recovery/overview";
}, {
    readonly id: "recovery.sleep";
    readonly moduleId: "recovery";
    readonly title: "Sleep";
    readonly href: "/(app)/recovery/sleep";
}, {
    readonly id: "recovery.readiness";
    readonly moduleId: "recovery";
    readonly title: "Readiness";
    readonly href: "/(app)/recovery/readiness";
}, {
    readonly id: "labs.overview";
    readonly moduleId: "labs";
    readonly title: "Overview";
    readonly href: "/(app)/labs/overview";
}, {
    readonly id: "labs.biomarkers";
    readonly moduleId: "labs";
    readonly title: "Biomarkers";
    readonly href: "/(app)/labs/biomarkers";
}, {
    readonly id: "labs.log";
    readonly moduleId: "labs";
    readonly title: "Log biomarkers";
    readonly href: "/(app)/labs/log";
}, {
    readonly id: "labs.upload";
    readonly moduleId: "labs";
    readonly title: "Upload";
    readonly href: "/(app)/labs/upload";
}, {
    readonly id: "settings.account";
    readonly moduleId: "settings";
    readonly title: "Account";
    readonly href: "/(app)/settings/account";
}, {
    readonly id: "settings.units";
    readonly moduleId: "settings";
    readonly title: "Units";
    readonly href: "/(app)/settings/units";
}, {
    readonly id: "settings.devices";
    readonly moduleId: "settings";
    readonly title: "Devices";
    readonly href: "/(app)/settings/devices";
}, {
    readonly id: "settings.privacy";
    readonly moduleId: "settings";
    readonly title: "Privacy";
    readonly href: "/(app)/settings/privacy";
}];
export type ModuleSectionId = (typeof MODULE_SECTIONS)[number]["id"];
export type ModuleSectionRoute = (typeof MODULE_SECTIONS)[number];
export declare function getModuleSections(moduleId: ModuleId): ModuleSectionRoute[];
export declare function getSectionById(id: ModuleSectionId): ModuleSectionRoute | undefined;
//# sourceMappingURL=moduleSectionRoutes.d.ts.map