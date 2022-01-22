import defineState from "./defineState/index.js";
import bindToStates from "./bindToStates/index.js";
import bindToStateProps from "./bindToStateProps/index.js";
import descendantMustNotRerender from "./descendantMustNotRerender/index.js";
import batchesUpdates from "./batchesUpdates/index.js";
import fragments from "./fragments/index.js";
import dontRenderDisconnectedNodes from "./dontRenderDisconnectedNodes/index.js";

defineState();
bindToStates();
bindToStateProps();
descendantMustNotRerender();
batchesUpdates();
fragments();
dontRenderDisconnectedNodes();
