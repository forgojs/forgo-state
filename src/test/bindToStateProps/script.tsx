import { DOMWindow, JSDOM } from "jsdom";
import { mount, ForgoRenderArgs, setCustomEnv } from "forgo";
import { defineState, bindToStateProps } from "../../index.js";
import promiseSignal from "../promiseSignal";

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

let renderCounter = 0;

function MessageBox() {
  const component = {
    render(props: any, args: ForgoRenderArgs) {
      if (renderCounter === 1) {
        firstPromise.resolve();
      }
      renderCounter++;
      return (
        <div>
          {state.messages.length ? (
            state.messages.map((m) => <p>{m}</p>)
          ) : (
            <p>There are no messages for {state.account}.</p>
          )}
        </div>
      );
    },
  };
  return bindToStateProps([[state, (x) => [x.messages]]], component);
}

export function run(dom: JSDOM) {
  window = dom.window;
  document = window.document;
  window.myAppState = state;
  window.firstPromise = firstPromise;
  setCustomEnv({ window, document });

  window.addEventListener("load", () => {
    mount(<MessageBox />, document.getElementById("root"));
  });
}
