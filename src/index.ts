import {
  ForgoRenderArgs,
  ForgoComponent,
  ForgoElementProps,
  rerender,
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

      const argsForUncheckedUpdation: ForgoRenderArgs[] = entries
        ? entries
            .filter((x) => !(x as RerenderOnAnyChange<TState, any>).propGetter)
            .map((x) => x.args)
        : [];

      let propsToCompare = entries
        ? entries
            .filter((x) => (x as RerenderOnAnyChange<TState, any>).propGetter)
            .map((x) => ({
              args: x.args,
              props: (x as RerenderOnAnyChange<TState, any>).propGetter(target),
            }))
        : [];

      target[prop] = value;

      let updatedProps = entries
        ? entries
            .filter((x) => (x as RerenderOnAnyChange<TState, any>).propGetter)
            .map((x) => ({
              args: x.args,
              props: (x as RerenderOnAnyChange<TState, any>).propGetter(target),
            }))
        : [];

      const argsListToUpdate = argsForUncheckedUpdation.concat(
        propsToCompare
          .filter((oldProp, i) =>
            oldProp.props.some((p, j) => p !== updatedProps[i].props[j])
          )
          .map((x) => x.args)
      );

      const argsListMap = new Map<ChildNode, ForgoRenderArgs[]>();

      for (const args of argsListToUpdate) {
        if (args.element.node) {
          let entry = argsListMap.get(args.element.node);
          if (!entry) {
            entry = [];
            argsListMap.set(args.element.node, entry);
          }
          entry.push(args);
        }
      }

      const argsListWithMinComponentIndex: ForgoRenderArgs[] = [];

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
          argsListWithMinComponentIndex.push(argsWithMinComponentIndex);
        }
      }

      // If we're rendering a parent node, skip the descendent nodes.
      const justTheNodes = argsListWithMinComponentIndex
        .map((x) => x.element.node)
        .filter((x) => x) as ChildNode[];

      const argsListOfParentNodes = argsToRenderInTheNextCycle
        .concat(argsListWithMinComponentIndex)
        .filter(
          (x) =>
            !justTheNodes.some(
              (y) =>
                y !== x.element.node && y.contains(x.element.node as ChildNode)
            )
        );

      for (const args of argsListOfParentNodes) {
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
    argsToRenderInTheNextCycle = [];
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
