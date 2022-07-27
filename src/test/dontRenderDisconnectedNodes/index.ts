import { JSDOM } from "jsdom";
import should from "should";

import htmlFile from "../htmlFile.js";
import { addNewMessage, renderAgain, run } from "./script.js";

export default function () {
  it("doesn't render disconnected nodes", async () => {
    const dom = new JSDOM(htmlFile(), {
      runScripts: "outside-only",
      resources: "usable",
    });
    const window = dom.window;

    await run(dom);

    addNewMessage();
    renderAgain();

    should.equal(
      window.document.body.innerHTML.trim(),
      '<div id="root"><!--null component render--></div>'
    );
  });
}
