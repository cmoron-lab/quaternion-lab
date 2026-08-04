import { version } from "../package.json";
import { mountLabApp } from "./ui/app";

const app = document.querySelector<HTMLElement>("#app");

if (!app) throw new Error("Le conteneur de l'application est introuvable.");
mountLabApp(app);

const versionBadge = document.querySelector<HTMLElement>("#app-version");
if (versionBadge) versionBadge.textContent = `v${version}`;
