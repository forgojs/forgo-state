# forgo-state

Easy Application State Management for [Forgo Apps](https://github.com/forgojs/forgo) using JavaScript Proxies.

## Installation

```sh
npm i forgo-state
```

## Defining application state variables

Start by defining one or more state variables using the defineState() API. These states can be bound to multiple components in the application.

```js
import { bindToStates, defineState } from "forgo-state";

const mailboxState = defineState({
  messages: [],
  drafts: [],
  spam: [],
  unread: 0,
});

const signinState = defineState({
  username: "",
  lastActive: 0,
});
```

## Binding components to your application state

Use bindToStates() to bind one or more states to any component. In the following example, whenever mailboxState or signinState changes, the bound component MailboxView is rerendered. Similarly, NotificationsBar is also bound to mailboxState.

```js
function MailboxView() {
  const component = {
    render(props: any, args: ForgoRenderArgs) {
      return (
        <div>
          {mailboxState.messages.length ? (
            mailboxState.messages.map((m) => <p>{m}</p>)
          ) : (
            <p>There are no messages for {signinState.username}.</p>
          )}
        </div>
      );
    },
  };
  return bindToStates([mailboxState, signinState], component);
}

function NotificationsBar() {
  const component = {
    render() {
      return (
        <div>
          {mailboxState.unread > 0 ? (
            <p>You have {mailboxState.unread} notifications.</p>
          ) : (
            <p>There are no notifications.</p>
          )}
        </div>
      );
    },
  };
  return bindToStates([mailboxState], component);
}
```

You could update the state properties directly:

```js
async function updateInbox() {
  const data = await fetchInboxData();
  // The next line causes a rerender of the MailboxView component
  mailboxState.messages = data;
}
```

## Binding components to specific properties of the state

Sometimes, you're interested in rerendering only when a specific property of a state variable changes. There's another api for this, bindToStateProps().

Usage is similar. But instead of an array of states you're interested in, you'll have to pass an array of [state, propertiesGetter] tuples.

Here's an example:

```js
function MailboxView() {
  const component = {
    render(props: any, args: ForgoRenderArgs) {
      return (
        <div>
          {mailboxState.messages.length ? (
            mailboxState.messages.map((m) => <p>{m}</p>)
          ) : (
            <p>There are no messages for {signinState.username}.</p>
          )}
        </div>
      );
    },
  };
  return bindToStateProps(
    // Render only if mailboxState.messages or mailboxState.drafts
    // or signinState.username changes.
    [
      [mailboxState, (state) => [state.messages, state.drafts]],
      [signinState, (state) => [state.username]],
    ],
    component
  );
}
```
