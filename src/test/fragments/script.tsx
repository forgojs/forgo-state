import { DOMWindow, JSDOM } from "jsdom";
import { mount, ForgoRenderArgs, setCustomEnv } from "forgo";
import { bindToStates, defineState } from "../../index.js";
import promiseSignal from "../promiseSignal";

let window: DOMWindow;
let document: HTMLDocument;

const firstPromise = promiseSignal();

type State = {
  totals: number;
};

const state: State = defineState({
  totals: 100,
});

function Parent() {
  const component = {
    render(props: any, args: ForgoRenderArgs) {
      if (window.parentCounter === 1) {
        firstPromise.resolve();
      }
      window.parentCounter++;
      return (
        <>
          <Child />
          <Child />
          <Child />
        </>
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
          <p>Total is {state.totals * window.childCounter}.</p>
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
