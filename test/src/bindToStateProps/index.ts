import { JSDOM } from "jsdom";
import htmlFile from "../htmlFile";
import { run } from "./script";
import "should";

export default function () {
  it("binds to state props", async () => {
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

    window.document.body.innerHTML.should.containEql(
      "<p>There are no messages for unknown.</p>"
    );

    window.myAppState.account = "boom";

    window.document.body.innerHTML.should.containEql(
      "<p>There are no messages for unknown.</p>"
    );

    window.myAppState.messages = ["hello", "world"];

    await window.firstPromise.promise;

    window.document.body.innerHTML.should.containEql(
      "<p>hello</p><p>world</p>"
    );
  });
}
