import * as forgo from "forgo";
import { DOMWindow, JSDOM } from "jsdom";
import { mount, ForgoRenderArgs, setCustomEnv } from "forgo";
import { bindToStates, defineState } from "../../index.js";

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

let renderArgs: ForgoRenderArgs;
export function renderAgain() {
  counter++;
  renderArgs.update();
}

function Parent() {
  return {
    render(props: {}, args: ForgoRenderArgs) {
      renderArgs = args;
      return counter === 0 ? <MessageBox /> : null;
    },
  };
}

function MessageBox() {
  const component = {
    render(props: any, args: ForgoRenderArgs) {
      return <p>You have {state.messageCount} messages.</p>;
    },
  };
  return bindToStates([state], component);
}

export function run(dom: JSDOM) {
  window = dom.window;
  document = window.document;
  setCustomEnv({ window, document });

  window.addEventListener("load", () => {
    mount(<Parent />, document.getElementById("root"));
  });
}
