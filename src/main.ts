import "./styles.css";
import { mountLabApp } from "./ui/app";

const app = document.querySelector<HTMLElement>("#app");

if (!app) throw new Error("Le conteneur de l'application est introuvable.");
mountLabApp(app);
