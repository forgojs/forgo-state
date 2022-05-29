import * as forgo from "forgo";
import { DOMWindow, JSDOM } from "jsdom";
import { mount, setCustomEnv, Component } from "forgo";
import { bindToStates, defineState } from "../../index.js";
import promiseSignal from "../promiseSignal.js";

import type { ForgoComponentCtor } from "forgo";

let window: DOMWindow;
let document: HTMLDocument;

const firstPromise = promiseSignal();

type State = {
  totals: number;
};

const state: State = defineState({
  totals: 100,
});

const Parent: ForgoComponentCtor = () => {
  const component = new Component({
    render() {
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
  });
  bindToStates([state], component);
  return component;
};

const Child: ForgoComponentCtor = () => {
  const component = new Component({
    render() {
      window.childCounter++;
      return (
        <div>
          <p>Total is {state.totals * window.childCounter}.</p>
        </div>
      );
    },
  });
  bindToStates([state], component);
  return component;
};

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
