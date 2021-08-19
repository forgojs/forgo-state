import { JSDOM } from "jsdom";
import htmlFile from "../htmlFile.js";
import { run } from "./script.js";
import should from "should";

export default function () {
  describe("renders fragments", () => {
    it("simple fragment", async () => {
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

      window.myAppState.totals = 200;
      await window.firstPromise.promise;
      should.equal(window.parentCounter, 2);
      should.equal(window.childCounter, 6);
      window.document.body.innerHTML.should.containEql(
        "<div><p>Total is 800.</p></div><div><p>Total is 1000.</p></div><div><p>Total is 1200.</p></div>"
      );
    });
  });
}
