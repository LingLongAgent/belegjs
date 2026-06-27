import { VERSION } from "../lib";

/** Editor bootstrap — the 3-pane editor + overview are built by the loop. */
const app = document.querySelector<HTMLDivElement>("#app");
if (app) {
  app.innerHTML = `<main class="shell"><h1>belegjs <small>v${VERSION}</small></h1>
    <p class="muted">DIN-5008-Editor — Übersicht & 3-Spalten-Editor folgen.</p></main>`;
}
