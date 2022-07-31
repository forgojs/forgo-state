import * as forgo from "forgo";
import { DOMWindow, JSDOM } from "jsdom";
import { mount, setCustomEnv, Component } from "forgo";
import { bindToStates, defineState } from "../../index.js";
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

const Parent: ForgoNewComponentCtor = () => {
  const component = new Component({
    render() {
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
  });
  bindToStates([state], component);
  return component;
};

const Child: ForgoNewComponentCtor = () => {
  const component = new Component({
    render() {
      window.childCounter++;
      return (
        <div>
          <p>This is the child.</p>
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
  window.firstPromise = firstPromise;
  window.parentCounter = 0;
  window.childCounter = 0;

  setCustomEnv({ window, document });

  return new Promise((resolve, reject) => {
    window.addEventListener("load", () => {
      try {
        mount(<Parent />, document.getElementById("root"));
        resolve(undefined);
      } catch (ex) {
        reject(ex);
      }
    });
  });
}
