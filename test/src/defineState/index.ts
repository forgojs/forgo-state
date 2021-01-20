import * as should from "should";
import { defineState } from "../../../";

export default function () {
  it("defines state", async () => {
    const state = defineState({
      inbox: [],
      messages: [],
      account: {},
    });

    should.exist(state.inbox);
    should.exist(state.messages);
    should.exist(state.account);
  });
}
