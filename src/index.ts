import {
  ForgoRenderArgs,
  ForgoComponent,
  ForgoElementProps,
  rerender,
  getForgoState,
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
      const argsToUpdatePlusPendingArgs = argsListToUpdate.concat(
        argsToRenderInTheNextCycle
      );

      // make a map, of node => all args attached to node
      const argsListMap = new Map<ChildNode, ForgoRenderArgs[]>();

      for (const args of argsToUpdatePlusPendingArgs) {
        if (args.element.node) {
          const state = getForgoState(args.element.node);
          if (state) {
            const componentState =
              state.components[args.element.componentIndex];
            if (componentState.numNodes === 1) {
              let entry = argsListMap.get(args.element.node);
              if (!entry) {
                entry = [];
                argsListMap.set(args.element.node, entry);
              }
              entry.push(args);
            }
            // This component rendered a fragment or an array
            else {
              const parentElement: HTMLElement = args.element.node
                .parentElement as HTMLElement;
              const childNodes = Array.from(parentElement.childNodes);
              const nodeIndex = childNodes.findIndex(
                (x) => x === args.element.node
              );
              const nodes = childNodes.slice(
                nodeIndex,
                nodeIndex + componentState.numNodes
              );
              for (const node of nodes) {
                let entry = argsListMap.get(node);
                if (!entry) {
                  entry = [];
                  argsListMap.set(node, entry);
                }
                entry.push(args);
              }
            }
          }
        }
      }

      // Now for each node, find the args with the lowest componentIndex
      // Rendering the component with the lowest componentIndex
      // The higher up components get rendered automatically.
      const argsListWithMinComponentIndex: [ChildNode, ForgoRenderArgs][] = [];

      for (const entries of argsListMap) {
        let argsWithMinComponentIndex: ForgoRenderArgs | undefined = undefined;
        const [node, argsList] = entries;
        for (const args of argsList) {
          if (argsWithMinComponentIndex) {
            if (
              args.element.componentIndex <
              argsWithMinComponentIndex.element.componentIndex
            ) {
              argsWithMinComponentIndex = args;
            }
          } else {
            argsWithMinComponentIndex = args;
          }
        }
        if (argsWithMinComponentIndex) {
          argsListWithMinComponentIndex.push([node, argsWithMinComponentIndex]);
        }
      }

      // 1. We gotta find if a node is a child of another node pending rerender
      //   If so, there's no need to render the descendant node.
      // 2. Also, if a component renders multiple nodes, include only the root node.
      const justTheNodes = argsListWithMinComponentIndex
        .map(([node]) => node)
        .filter((x) => x) as ChildNode[];

      const argsListOfParentNodes = argsListWithMinComponentIndex.filter(
        ([node, args]) =>
          !justTheNodes.some((x) => x !== node && x.contains(node)) &&
          node === args.element.node
      );

      argsToRenderInTheNextCycle.length = 0;
      for (const [node, args] of argsListOfParentNodes) {
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
