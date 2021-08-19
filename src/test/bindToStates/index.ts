import { JSDOM } from "jsdom";
import htmlFile from "../htmlFile.js";
import { run } from "./script.js";
import should from "should";

export default function () {
  it("binds to states", async () => {
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

    window.document.body.innerHTML.should.containEql("There are no messages for unknown.");

    window.myAppState.account = "boom";

    await window.firstPromise.promise;

    window.document.body.innerHTML.should.containEql(
      "<p>There are no messages for boom.</p>"
    );

    window.myAppState.messages = ["hello", "world"];

    await window.secondPromise.promise;

    window.document.body.innerHTML.should.containEql(
      "<p>hello</p><p>world</p>"
    );
  });
}
