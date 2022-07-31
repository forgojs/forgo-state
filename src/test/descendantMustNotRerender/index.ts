import { JSDOM } from "jsdom";
import htmlFile from "../htmlFile.js";
import { run } from "./script.js";
import should from "should";

export default function () {
  it("must not rerender descendent", async () => {
    const dom = new JSDOM(htmlFile(), {
      runScripts: "outside-only",
      resources: "usable",
    });
    const window = dom.window;

    await run(dom);

    window.myAppState.account = "boom";

    await window.firstPromise.promise;

    should.equal(window.parentCounter, 2);
    should.equal(window.childCounter, 2);
  });
}
