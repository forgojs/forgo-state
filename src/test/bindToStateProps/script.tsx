import * as forgo from "forgo";
import { DOMWindow, JSDOM } from "jsdom";
import { mount, setCustomEnv, Component } from "forgo";
import { defineState, bindToStateProps } from "../../index.js";
import promiseSignal from "../promiseSignal.js";

import type { ForgoNewComponentCtor } from "forgo";

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

const MessageBox: ForgoNewComponentCtor = () => {
  const component = new Component({
    render() {
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
  });
  bindToStateProps([[state, (x) => [x.messages]]], component);
  return component;
};

export async function run(dom: JSDOM) {
  window = dom.window;
  document = window.document;
  window.myAppState = state;
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
