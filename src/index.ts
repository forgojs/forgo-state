/*
  How it works:

  - Users create JS proxies using the defineState() function.
  - They bind this state (the proxy object) to various components via bindToStates() and bindToStateProps() functions.
  - Since the proxy lets us capture changes to itself, we trigger component rerenders (on bound components) when that happens.
*/

import {
  Component,
  ForgoElementProps,
  rerender,
  getForgoState,
  NodeAttachedComponentState,
  NodeAttachedState,
} from "forgo";

interface StateBoundComponentInfo {
  component: Component;
}

interface PropertyBoundComponentInfo<TState> extends StateBoundComponentInfo {
  propGetter: (state: TState) => any[];
}

const stateToComponentsMap: Map<any, StateBoundComponentInfo[]> = new Map();

export function defineState<TState extends Record<string, any>>(
  state: TState
): TState {
  const handlers = {
    set(target: TState, prop: string & keyof TState, value: any) {
      const entries = stateToComponentsMap.get(proxy) ?? [];

      // If bound to the state directly, mark for update on any state change
      const stateBoundComponents: StateBoundComponentInfo[] = entries.filter(
        (x) => !(x as PropertyBoundComponentInfo<TState>).propGetter
      );

      const propBoundComponents = entries.filter(
        (x) => (x as PropertyBoundComponentInfo<TState>).propGetter
      );

      // Get the props before update
      const propBoundComponentProps = propBoundComponents.map((x) => ({
        component: x.component,
        props: (x as PropertyBoundComponentInfo<TState>).propGetter(target),
      }));

      target[prop] = value;

      // Get the props after update
      const propBoundComponentPropsUpdated = propBoundComponents.map((x) => ({
        component: x.component,
        props: (x as PropertyBoundComponentInfo<TState>).propGetter(target),
      }));

      // State bound components (a) need to be rerendered anyway.
      // Prop bound components (b) are rendendered if changed.
      // So concat (a) and (b)
      const componentsToUpdate = stateBoundComponents
        .concat(
          propBoundComponentProps
            .filter((oldProp, i) =>
              oldProp.props.some(
                (p, j) => p !== propBoundComponentPropsUpdated[i].props[j]
              )
            )
            .map((x) => x)
        )
        .map((x) => x.component);

      // Concat latest updates with pending updates.
      const argsToUpdatePlusPendingArgs = Array.from(
        new Set<Component>([
          ...Array.from(componentsToRenderInTheNextCycle),
          ...componentsToUpdate,
        ])
      );

      const componentStatesAndArgs: [
        NodeAttachedComponentState<any>,
        Component
      ][] = argsToUpdatePlusPendingArgs.map((component) => {
        const state = getForgoState(
          component.__internal.element.node as ChildNode
        );
        if (!state) {
          throw new Error("Missing state on node.");
        } else {
          return [
            state.components[component.__internal.element.componentIndex],
            component,
          ];
        }
      });

      // If a parent component is already rerendering,
      // don't queue the child rerender.
      const dedupedComponentsToUpdate = componentStatesAndArgs.filter(
        (item) => {
          const [componentState, component] = item;

          let node: ChildNode | null = component.__internal.element
            .node as ChildNode;
          let state: NodeAttachedState | undefined = getForgoState(node);
          let parentStates = (state as NodeAttachedState).components.slice(
            0,
            component.__internal.element.componentIndex
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
        }
      );

      dedupedComponentsToUpdate.forEach(([, component]) =>
        componentsToRenderInTheNextCycle.add(component)
      );

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
const componentsToRenderInTheNextCycle = new Set<Component>();

function doRender() {
  if (componentsToRenderInTheNextCycle.size > 0) {
    for (const component of componentsToRenderInTheNextCycle) {
      if (
        component.__internal.element.node &&
        component.__internal.element.node.isConnected
      ) {
        // Dequeue the component before the render, so that if the component
        // triggers more renders of itself they don't get no-op'd
        componentsToRenderInTheNextCycle.delete(component);

        rerender(component.__internal.element);
      }
    }
  }
}

export function bindToStates<TState>(
  states: TState[],
  component: Component<any>
): void {
  bindToStateProps(
    states.map((state) => [state, undefined]),
    component
  );
}

export function bindToStateProps<TState>(
  stateBindings: [state: TState, propGetter?: (state: TState) => any[]][],
  component: Component<any>
): void {
  component.addEventListener("mount", () => {
    for (const [state, propGetter] of stateBindings) {
      let entries = stateToComponentsMap.get(state);

      if (!entries) {
        entries = [];
        stateToComponentsMap.set(state, entries);
      }

      if (propGetter) {
        const newEntry: PropertyBoundComponentInfo<TState> = {
          component,
          propGetter,
        };

        entries.push(newEntry);
      } else {
        const newEntry: StateBoundComponentInfo = {
          component,
        };

        entries.push(newEntry);
      }
    }
  });

  component.addEventListener("unmount", () => {
    for (const [state] of stateBindings) {
      let entry = stateToComponentsMap.get(state);

      if (entry) {
        stateToComponentsMap.set(
          state,
          entry.filter((x) => x.component !== component)
        );
      } else {
        throw new Error("Component entry missing in state map.");
      }
    }
  });
}
