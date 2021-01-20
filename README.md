# forgo-state

Easy Application State Management for [Forgo](https://github.com/forgojs/forgo) Apps using JavaScript Proxies.

## Installation

```sh
npm i forgo-state
```

## Defining application state variables

First define one or more state variables using the defineState() API.

```js
import { bindToStates, defineState } from "forgo-state";

const mailboxState = defineState({
  messages: [],
  drafts: [],
  spam: [],
});

const signinState = defineState({
  username: "",
  lastActive: 0,
});
```

## Binding components to your application state

Use bindToStates() while defining your Forgo components to bind one or more states to a specific component. In the following example, whenever mailboxState or signinState changes, the component is rerendered.

```js
function MailboxView() {
  const component = {
    render(props: any, args: ForgoRenderArgs) {
      return (
        <div>
          {state.messages.length ? (
            state.messages.map((m) => <p>{m}</p>)
          ) : (
            <p>There are no messages for {state.username}.</p>
          )}
        </div>
      );
    },
  };
  return bindToStates([mailboxState, signinState], component);
}
```

You could update the state properties any way you choose:

```js
async function updateInbox() {
  const data = await fetchInboxData();
  // The next line causes a rerender of the MailboxView component
  mailboxState.messages = data;
}
```

## Binding components to specific properties of the state

Sometimes, you're interested in rerendering only when a specific property of the state changes. There's another api for this, bindToStateProps().

Usage is similar. But instead of an array of states you're interested in, you'll have to pass an array of [state, propertiesGetter] tuples.

Here's an example:

```js
function MailboxView() {
  const component = {
    render(props: any, args: ForgoRenderArgs) {
      return (
        <div>
          {state.messages.length ? (
            state.messages.map((m) => <p>{m}</p>)
          ) : (
            <p>There are no messages for {state.username}.</p>
          )}
        </div>
      );
    },
  };
  return bindToStateProps(
    // Render only if mailboxState.messages or mailboxState.drafts
    // or state.username changes.
    [
      [mailboxState, (state) => [state.messages, state.drafts]],
      [signinState, (state) => [state.username]],
    ],
    component
  );
}
```
