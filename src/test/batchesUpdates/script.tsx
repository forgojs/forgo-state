import * as forgo from "forgo";
import { DOMWindow, JSDOM } from "jsdom";
import { mount, ForgoRenderArgs, setCustomEnv } from "forgo";
import { bindToStates, defineState } from "../../index.js";
import promiseSignal from "../promiseSignal";

let window: DOMWindow;
let document: HTMLDocument;

type State = {
  messages: string[];
  account: string;
};

const state: State = defineState({
  messages: [],
  account: "unknown",
});

const firstPromise = promiseSignal();

function MessageBox() {
  const component = {
    render(props: any, args: ForgoRenderArgs) {
      window.renderCounter++;
      if (window.renderCounter === 2) {
        firstPromise.resolve();
      }
      return (
        <div>
          {state.messages.length ? (
            <div>
              <p>Messages for {state.account}</p>
              <ul>
                {state.messages.map((m) => (
                  <li>{m}</li>
                ))}
              </ul>
            </div>
          ) : (
            <p>There are no messages for {state.account}.</p>
          )}
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
  window.renderCounter = 0;
  window.firstPromise = firstPromise;
  setCustomEnv({ window, document });

  window.addEventListener("load", () => {
    mount(<MessageBox />, document.getElementById("root"));
  });
}
