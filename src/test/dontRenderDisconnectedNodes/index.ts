import { JSDOM } from "jsdom";
import htmlFile from "../htmlFile.js";
import { addNewMessage, renderAgain, run } from "./script.js";

export default function () {
  it("doesn't render disconnected nodes", async () => {
    const dom = new JSDOM(htmlFile(), {
      runScripts: "outside-only",
      resources: "usable",
    });
    const window = dom.window;

    run(dom);

    await new Promise<void>((resolve) => {
      window.addEventListener("load", () => {
        resolve();
      });
    });

    addNewMessage();
    renderAgain();

    window.document.body.innerHTML.trim().should.containEql(`<div id="root"></div>`)
  });
}
