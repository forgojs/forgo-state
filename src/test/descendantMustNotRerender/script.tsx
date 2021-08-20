import * as forgo from "forgo";
import { DOMWindow, JSDOM } from "jsdom";
import { mount, ForgoRenderArgs, setCustomEnv } from "forgo";
import { bindToStates, defineState } from "../../index.js";
import promiseSignal from "../promiseSignal.js";

let window: DOMWindow;
let document: HTMLDocument;

const firstPromise = promiseSignal();

type State = {
  messages: string[];
  account: string;
};

const state: State = defineState({
  messages: [],
  account: "unknown",
});

function Parent() {
  const component = {
    render(props: any, args: ForgoRenderArgs) {
      if (window.parentCounter === 1) {
        firstPromise.resolve();
      }
      window.parentCounter++;
      return (
        <div>
          <p>This is the parent.</p>
          <Child />
        </div>
      );
    },
  };
  return bindToStates([state], component);
}

function Child() {
  const component = {
    render(props: any, args: ForgoRenderArgs) {
      window.childCounter++;
      return (
        <div>
          <p>This is the child.</p>
        </div>
      );
    },
  };
  return bindToStates([state], component);
}

export function run(dom: JSDOM) {
  window = dom.window;
  document = window.document;
  window.myAppState = state;
  window.firstPromise = firstPromise;
  window.parentCounter = 0;
  window.childCounter = 0;
  
  setCustomEnv({ window, document });

  window.addEventListener("load", () => {
    mount(<Parent />, document.getElementById("root"));
  });
}
