import { JSDOM } from "jsdom";
import htmlFile from "../htmlFile";
import { run } from "./script";
import * as should from "should";

export default function () {
  it("skips rerendering descendant if parent is rerendering", async () => {
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

    window.myAppState.account = "boom";

    await window.firstPromise.promise;

    should.equal(window.parentCounter, 2);
    should.equal(window.childCounter, 2);
  });
}
