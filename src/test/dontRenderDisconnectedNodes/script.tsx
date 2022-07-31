import * as forgo from "forgo";
import { DOMWindow, JSDOM } from "jsdom";
import { mount, setCustomEnv, Component } from "forgo";
import { bindToStates, defineState } from "../../index.js";

import type { ForgoNewComponentCtor } from "forgo";

let window: DOMWindow;
let document: Document;

type State = {
  messageCount: number;
};

const state: State = defineState({
  messageCount: 0,
});

export function addNewMessage() {
  state.messageCount++;
}

let counter = 0;

let component: Component;
export function renderAgain() {
  counter++;
  component.update();
}

const Parent: ForgoNewComponentCtor = () => {
  component = new Component({
    render() {
      return counter === 0 ? <MessageBox /> : null;
    },
  });
  return component;
};

const MessageBox: ForgoNewComponentCtor = () => {
  const component = new Component({
    render() {
      return <p>You have {state.messageCount} messages.</p>;
    },
  });
  bindToStates([state], component);
  return component;
};

export async function run(dom: JSDOM) {
  window = dom.window;
  document = window.document;
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
