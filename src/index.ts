import {
  ForgoRenderArgs,
  ForgoComponent,
  ForgoElementProps,
  rerender,
  getForgoState,
  NodeAttachedComponentState,
  NodeAttachedState,
} from "forgo";

export type ForgoProxyState = {};

type StateMapEntry<TProps extends ForgoElementProps> = {
  component: ForgoComponent<TProps>;
  args: ForgoRenderArgs;
};

type RerenderOnAnyChange<TState, TProps extends ForgoElementProps> = {
  propGetter: (state: TState) => any[];
} & StateMapEntry<TProps>;

const stateMap: Map<any, StateMapEntry<any>[]> = new Map();

export function defineState<TState extends { [key: string]: any }>(
  state: TState
): TState {
  const handlers = {
    set(target: TState, prop: keyof TState, value: any) {
      const entries = stateMap.get(proxy);

      // if bound to the state directly, add for updation on any state change.
      const argsForUncheckedUpdation: ForgoRenderArgs[] = entries
        ? entries
            .filter((x) => !(x as RerenderOnAnyChange<TState, any>).propGetter)
            .map((x) => x.args)
        : [];

      // Get the props before update
      let propsToCompare = entries
        ? entries
            .filter((x) => (x as RerenderOnAnyChange<TState, any>).propGetter)
            .map((x) => ({
              args: x.args,
              props: (x as RerenderOnAnyChange<TState, any>).propGetter(target),
            }))
        : [];

      target[prop] = value;

      // Get the props after update
      let updatedProps = entries
        ? entries
            .filter((x) => (x as RerenderOnAnyChange<TState, any>).propGetter)
            .map((x) => ({
              args: x.args,
              props: (x as RerenderOnAnyChange<TState, any>).propGetter(target),
            }))
        : [];

      // concat state based updates and props based updates
      const argsListToUpdate = argsForUncheckedUpdation.concat(
        propsToCompare
          .filter((oldProp, i) =>
            oldProp.props.some((p, j) => p !== updatedProps[i].props[j])
          )
          .map((x) => x.args)
      );

      // concat latest updates with pending updates.
      const argsToUpdatePlusPendingArgs = argsToRenderInTheNextCycle.concat(
        argsListToUpdate.filter((x) => !argsToRenderInTheNextCycle.includes(x))
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
      //  don't queue the child rerender.
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

      argsToRenderInTheNextCycle.length = 0;
      for (const [, args] of componentsToUpdate) {
        argsToRenderInTheNextCycle.push(args);
      }

      setTimeout(() => {
        doRender();
      }, 0);

      return true;
    },
  };

  const proxy = new Proxy(state, handlers);

  return proxy;
}

let argsToRenderInTheNextCycle: ForgoRenderArgs[] = [];

function doRender() {
  if (argsToRenderInTheNextCycle.length) {
    for (const args of argsToRenderInTheNextCycle) {
      if (args.element.node) {
        rerender(args.element);
      }
    }
    argsToRenderInTheNextCycle.length = 0;
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
        let entries = stateMap.get(state);

        if (!entries) {
          entries = [];
          stateMap.set(state, entries);
        }

        if (propGetter) {
          const newEntry: RerenderOnAnyChange<TState, TProps> = {
            component: wrappedComponent,
            propGetter,
            args,
          };

          entries.push(newEntry);
        } else {
          const newEntry: StateMapEntry<TProps> = {
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
        let entry = stateMap.get(state);

        if (entry) {
          stateMap.set(
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
