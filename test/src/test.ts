import defineState from "./defineState";
import bindToStates from "./bindToStates";
import bindToStateProps from "./bindToStateProps";
import descendantMustNotRerender from "./descendantMustNotRerender";
import batchesUpdates from "./batchesUpdates";
import fragments from "./fragments";

defineState();
bindToStates();
bindToStateProps();
descendantMustNotRerender();
batchesUpdates();
fragments();
