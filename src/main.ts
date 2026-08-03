import "./styles.css";
import { LabScene } from "./scene/lab-scene";

const app = document.querySelector("#app");

if (!app) throw new Error("Le conteneur de l'application est introuvable.");

app.innerHTML = `
  <main class="lab">
    <header class="lab__header">
      <p class="lab__eyebrow">LOTUSim · laboratoire d'attitude</p>
      <h1>Repères et orientation</h1>
    </header>
    <section class="scene-shell" aria-label="Instrument d'orientation 3D">
      <div class="scene-shell__toolbar">
        <p class="scene-shell__legend">Monde ENU: X Est · Y Nord · Z Haut<br>Corps FLU: X Avant · Y Gauche · Z Haut</p>
        <button class="scene-shell__reset" type="button">Réinitialiser la caméra</button>
      </div>
      <div class="scene-shell__canvas" aria-label="Bateau FLU dans le monde ENU"></div>
    </section>
  </main>
`;

const canvasContainer = app.querySelector<HTMLElement>(".scene-shell__canvas");
const resetButton = app.querySelector<HTMLButtonElement>(".scene-shell__reset");

if (!canvasContainer || !resetButton) throw new Error("Les contrôles de scène sont introuvables.");

try {
  const scene = new LabScene(canvasContainer);
  scene.setOrientation([1, 0, 0, 0]);
  resetButton.addEventListener("click", () => scene.resetCamera());
  new ResizeObserver(() => scene.resize()).observe(canvasContainer);
} catch {
  canvasContainer.textContent = "La scène 3D n'a pas pu démarrer sur ce navigateur.";
}
