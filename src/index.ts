/*
  How it works:

  - Users create JS proxies using the defineState() function.
  - They bind this state (the proxy object) to various components via bindToStates() and bindToStateProps() functions.
  - Since the proxy lets us capture changes to itself, we trigger component rerenders (on bound components) when that happens.
*/

import {
  Component,
  ComponentState,
  getForgoState,
  legacyComponentSyntaxCompat,
  ForgoComponent,
  NodeAttachedState,
} from "forgo";

interface StateBoundComponentInfo {
  component: Component<any>;
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
        ComponentState<any>,
        Component
      ][] = argsToUpdatePlusPendingArgs.map((component, index) => {
        const state = getForgoState(
          component.__internal.element.node as ChildNode
        );
        if (!state) {
          throw new Error("Missing state on node.");
        }
        const componentState: ComponentState<any> =
          state.components[component.__internal.element.componentIndex];
        if (!componentState) {
          throw new Error(
            "Attempted to update a component that doesn't exist anymore"
          );
        }

        return [componentState, component];
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
const componentsToRenderInTheNextCycle = new Set<Component<any>>();

function doRender() {
  Array.from(componentsToRenderInTheNextCycle).forEach((component) => {
    // Dequeue the component before the render, so that if the component
    // triggers more renders of itself they don't get no-op'd
    componentsToRenderInTheNextCycle.delete(component);

    component.update();
  });
}

export function bindToStates<TState, TProps extends object>(
  states: TState[],
  component: Component<TProps>
): Component<TProps> {
  return bindToStateProps(
    states.map((state) => [state, undefined]),
    component
  );
}

export function bindToStateProps<TState, TProps extends object>(
  stateBindings: [state: TState, propGetter?: (state: TState) => any[]][],
  suppliedComponent: Component<TProps> | ForgoComponent<TProps>
): Component<TProps> {
  const component =
    suppliedComponent instanceof Component
      ? suppliedComponent
      : legacyComponentSyntaxCompat(suppliedComponent);

  component.mount(() => {
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

  component.unmount(() => {
    for (const [state] of stateBindings) {
      let entry = stateToComponentsMap.get(state);

      if (entry) {
        entry.splice(
          entry.findIndex((x) => x.component === component),
          1
        );
        // This could be optimized into an unshift / pop at the specific index
        componentsToRenderInTheNextCycle.delete(component);
      } else {
        throw new Error("Component entry missing in state map.");
      }
    }
  });

  // TODO: We only do this to avoid breaking compat with the legacy component
  // syntax, but with Forgo v4 it won't be necessary.
  return component;
}
