/*
  How it works:

  - Users create JS proxies using the defineState() function.
  - They bind this state (the proxy object) to various components via bindToStates() and bindToStateProps() functions.
  - Since the proxy let's us capture changes to itself, we trigger component rerenders (on bound components) when that happens.
*/

import {
  ForgoRenderArgs,
  ForgoComponent,
  ForgoElementProps,
  rerender,
  getForgoState,
  NodeAttachedComponentState,
  NodeAttachedState,
} from "forgo";

type StateBoundComponentInfo<TProps extends ForgoElementProps> = {
  component: ForgoComponent<TProps>;
  args: ForgoRenderArgs;
};

type PropertyBoundComponentInfo<TState, TProps extends ForgoElementProps> = {
  propGetter: (state: TState) => any[];
} & StateBoundComponentInfo<TProps>;

const stateToComponentsMap: Map<any, StateBoundComponentInfo<any>[]> =
  new Map();

export function defineState<TState extends Record<string, any>>(
  state: TState
): TState {
  const handlers = {
    set(target: TState, prop: string & keyof TState, value: any) {
      const entries = stateToComponentsMap.get(proxy);

      // if bound to the state directly, add for updation on any state change.
      const stateBoundComponentArgs: ForgoRenderArgs[] = entries
        ? entries
            .filter(
              (x) => !(x as PropertyBoundComponentInfo<TState, any>).propGetter
            )
            .map((x) => x.args)
        : [];

      const propBoundComponents = entries
        ? entries.filter(
            (x) => (x as PropertyBoundComponentInfo<TState, any>).propGetter
          )
        : [];

      // Get the props before update
      let propBoundComponentArgs = propBoundComponents.map((x) => ({
        args: x.args,
        props: (x as PropertyBoundComponentInfo<TState, any>).propGetter(
          target
        ),
      }));

      target[prop] = value;

      // Get the props after update
      let updatedProps = propBoundComponents.map((x) => ({
        args: x.args,
        props: (x as PropertyBoundComponentInfo<TState, any>).propGetter(
          target
        ),
      }));

      // State bound components (a) need to be rerendered anyway.
      // Prop bound components (b) are rendendered if changed.
      // So concat (a) and (b)
      const argsListToUpdate = stateBoundComponentArgs.concat(
        propBoundComponentArgs
          .filter((oldProp, i) =>
            oldProp.props.some((p, j) => p !== updatedProps[i].props[j])
          )
          .map((x) => x.args)
      );

      // concat latest updates with pending updates.
      const argsToUpdatePlusPendingArgs = Array.from(
        new Set([
          ...Array.from(argsToRenderInTheNextCycle),
          ...argsListToUpdate,
        ])
      );

      const componentStatesAndArgs: [
        NodeAttachedComponentState<any>,
        ForgoRenderArgs
      ][] = argsToUpdatePlusPendingArgs.map((x) => {
        const state = getForgoState(x.element.node as ChildNode);
        if (!state) {
          throw new Error("Missing state on node.");
        } else {
          return [state.components[x.element.componentIndex], x];
        }
      });

      // If a parent component is already rerendering,
      // don't queue the child rerender.
      const componentsToUpdate = componentStatesAndArgs.filter((item) => {
        const [componentState, args] = item;

        let node: ChildNode | null = args.element.node as ChildNode;
        let state: NodeAttachedState | undefined = getForgoState(node);
        let parentStates = (state as NodeAttachedState).components.slice(
          0,
          args.element.componentIndex
        );
        while (node && state) {
          if (
            parentStates.some((x) =>
              componentStatesAndArgs.some(
                ([compStateInArray]) =>
                  compStateInArray.component === x.component
              )
            )
          ) {
            return false;
          }
          node = node.parentElement;
          if (node) {
            state = getForgoState(node);
            if (state) {
              parentStates = state.components.filter(
                (x) => x !== componentState
              );
            }
          }
        }
        return true;
      });

      for (const [, args] of componentsToUpdate) {
        argsToRenderInTheNextCycle.add(args);
      }

      setTimeout(() => {
        doRender();
      }, 0);

      return true;
    },
  };

  const proxy = new Proxy<TState>(state, handlers);

  return proxy;
}

// We make this a Set because if rendering a component triggers another
// forgo-state update we want to be sure we still finish updating everything we
// had queued, plus everything the subrender enqueues
const argsToRenderInTheNextCycle = new Set<ForgoRenderArgs>();

function doRender() {
  if (argsToRenderInTheNextCycle.size > 0) {
    for (const args of argsToRenderInTheNextCycle) {
      if (args.element.node && args.element.node.isConnected) {
        rerender(args.element);
        argsToRenderInTheNextCycle.delete(args);
      }
    }
  }
}

export function bindToStates<TState, TProps extends ForgoElementProps>(
  states: TState[],
  component: ForgoComponent<TProps>
): ForgoComponent<TProps> {
  return bindToStateProps(
    states.map((state) => [state, undefined]),
    component
  );
}

export function bindToStateProps<TState, TProps extends ForgoElementProps>(
  stateBindings: [state: TState, propGetter?: (state: TState) => any[]][],
  component: ForgoComponent<TProps>
): ForgoComponent<TProps> {
  const wrappedComponent = {
    ...component,
    mount(props: TProps, args: ForgoRenderArgs) {
      for (const [state, propGetter] of stateBindings) {
        let entries = stateToComponentsMap.get(state);

        if (!entries) {
          entries = [];
          stateToComponentsMap.set(state, entries);
        }

        if (propGetter) {
          const newEntry: PropertyBoundComponentInfo<TState, TProps> = {
            component: wrappedComponent,
            propGetter,
            args,
          };

          entries.push(newEntry);
        } else {
          const newEntry: StateBoundComponentInfo<TProps> = {
            component: wrappedComponent,
            args,
          };

          entries.push(newEntry);
        }
      }

      if (component.mount) {
        component.mount(props, args);
      }
    },
    unmount(props: TProps, args: ForgoRenderArgs) {
      for (const [state] of stateBindings) {
        let entry = stateToComponentsMap.get(state);

        if (entry) {
          stateToComponentsMap.set(
            state,
            entry.filter((x) => x.component !== wrappedComponent)
          );
        } else {
          throw new Error("Component entry missing in state map.");
        }
      }

      if (component.unmount) {
        component.unmount(props, args);
      }
    },
  };

  return wrappedComponent;
}
