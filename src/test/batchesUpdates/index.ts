import { JSDOM } from "jsdom";
import htmlFile from "../htmlFile.js";
import { run } from "./script.js";
import should from "should";

export default function () {
  it("batches updates", async () => {
    const dom = new JSDOM(htmlFile(), {
      runScripts: "outside-only",
      resources: "usable",
    });
    const window = dom.window;

    await run(dom);

    window.document.body.innerHTML.should.containEql(
      "There are no messages for unknown."
    );

    window.myAppState.messages = ["hello", "world"];
    window.myAppState.account = "boom";

    // await window.firstPromise.promise;

    await new Promise((res) => {
      setTimeout(res, 100);
    });

    window.renderCounter.should.equal(2);

    should.equal(
      window.document.body.innerHTML.includes(
        "<div><p>Messages for boom</p><ul><li>hello</li><li>world</li></ul></div>"
      ),
      true
    );
  });
}
