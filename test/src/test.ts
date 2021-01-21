import defineState from "./defineState";
import bindToStates from "./bindToStates";
import bindToStateProps from "./bindToStateProps";
import descendantMustNotRerender from "./descendantMustNotRerender";
import batchesUpdates from "./batchesUpdates";

defineState();
bindToStates();
bindToStateProps();
descendantMustNotRerender();
batchesUpdates();
