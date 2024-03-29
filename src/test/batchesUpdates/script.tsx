import * as forgo from "forgo";
import { DOMWindow, JSDOM } from "jsdom";
import { mount, setCustomEnv, Component } from "forgo";
import { bindToStates, defineState } from "../../index.js";
import promiseSignal from "../promiseSignal.js";

import type { ForgoNewComponentCtor } from "forgo";

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

const MessageBox: ForgoNewComponentCtor = () => {
  const component = new Component({
    render() {
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
  });
  bindToStates([state], component);
  return component;
};

export async function run(dom: JSDOM) {
  window = dom.window;
  document = window.document;
  window.myAppState = state;
  window.renderCounter = 0;
  window.firstPromise = firstPromise;
  setCustomEnv({ window, document });

  return new Promise((resolve, reject) => {
    window.addEventListener("load", () => {
      try {
        mount(<MessageBox />, document.getElementById("root"));
        resolve(undefined);
      } catch (ex) {
        reject(ex);
      }
    });
  });
}
