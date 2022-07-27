import * as forgo from "forgo";
import { DOMWindow, JSDOM } from "jsdom";
import { mount, setCustomEnv, Component } from "forgo";
import { bindToStates, defineState } from "../../index.js";
import promiseSignal from "../promiseSignal.js";

import type { ForgoNewComponentCtor } from "forgo";

let window: DOMWindow;
let document: Document;

const firstPromise = promiseSignal();

const state = defineState({
  totals: 100,
});

const Parent: ForgoNewComponentCtor = () => {
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

const Child: ForgoNewComponentCtor = () => {
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
