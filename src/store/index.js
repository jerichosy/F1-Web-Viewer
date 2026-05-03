import Vue from "vue";
import Vuex from "vuex";

import F1TV_API from "@/lib/F1TV_API";
import deepClone from "@/lib/deepClone";

Vue.use(Vuex);

const savedState = {
  layouts: JSON.parse(localStorage.getItem("layouts")),
  layout: JSON.parse(localStorage.getItem("layout")),
  token: localStorage.getItem("token"),
  layoutColumns: parseInt(localStorage.getItem("layoutColumns")),
  layoutRowHeight: parseInt(localStorage.getItem("layoutRowHeight")),
  streamType: localStorage.getItem("streamType"),
  playerType: localStorage.getItem("playerType"),
};

const updateStore = (key, local) => {
  localStorage.setItem(key, local);
};

export default new Vuex.Store({
  state: {
    layouts: savedState.layouts || [],
    layout: savedState.layout || [],
    token: savedState.token || "",
    layoutColumns: savedState.layoutColumns || 12,
    layoutRowHeight: savedState.layoutRowHeight || Math.round(screen.availHeight / 12),
    playback: true,
    username: "",
    password: "",
    authError: "",
    streamType: savedState.streamType || "BIG_SCREEN_HLS",
    playerType: savedState.playerType || "VIDEOJS",
  },
  getters: {
    layouts: state => state.layouts,
    layout: state => state.layout,
    layoutColumns: state => state.layoutColumns,
    layoutRowHeight: state => state.layoutRowHeight,
    playback: state => state.playback,
    token: state => state.token,
    authError: state => state.authError,
    authenticated: state => !!state.token,
    streamType: state => state.streamType,
    playerType: state => state.playerType,
  },
  actions: {
    setLayout({ commit, dispatch }, layout) {
      commit("updateLayout", layout);
      dispatch("saveLayout", layout);
    },
    setActiveLayout({ commit, dispatch, state }, id) {
      const layouts = [];

      for (let layout of state.layouts) {
        if (layout.id === id) {
          layout.active = true;

          dispatch("setLayout", deepClone(layout.layout));
          commit("setLayoutColumns", layout.columns);
          commit("setLayoutRowHeight", layout.rowHeight);
        } else {
          layout.active = false;
        }

        layouts.push(layout);
      }

      commit("updateLayouts", layouts);
    },
    addToLayout({ commit, state }, layout) {
      commit("updateLayout", [...state.layout, ...layout]);
    },
    addToLayouts({ commit, state }, layout) {
      commit("updateLayouts", [...state.layouts, ...layout]);
    },
    saveLayout({ commit }, layout) {
      commit(
        "saveLayout",
        layout.filter(item => item.i !== "drop")
      );
    },
    setItemStatic({ commit, state }, index) {
      commit("setItem", {
        index,
        key: "static",
        value: !state.layout[index].static
      });
    },
    async authenticate({ commit }, credentials) {
      try {
        const e = new window.reese84.Protection;
        e.start();
        const reeceToken = await e.token();
        const res = await F1TV_API.authenticate(credentials.username, credentials.password, reeceToken);

        if (res.status === 200) {
          if (res.data.data) {
            commit("updateToken", res.data.data.subscriptionToken);
          } else {
            let err = new Error(res.data.Detail);
            commit("authError", err);
            return Promise.reject(err);
          }
        }

        return res;
      } catch (err) {
        if (err.message.includes(401)) {
          err.message = "Username or password is incorrect";
        }

        commit("authError", err);

        return Promise.reject(err);
      }
    }
  },
  mutations: {
    updateLayout(state, layout) {
      state.layout = layout;
    },
    updateLayouts(state, layouts) {
      state.layouts = layouts;

      updateStore("layouts", JSON.stringify(layouts));
    },
    saveLayout(state, layout) {
      updateStore("layout", JSON.stringify(layout));
    },
    setItem(state, { index, key, value }) {
      state.layout[index][key] = value;

      updateStore("layout", JSON.stringify(state.layout));
    },
    setLayoutColumns(state, columns) {
      state.layoutColumns = columns;

      updateStore("layoutColumns", columns);
    },
    setLayoutRowHeight(state, rowHeight) {
      state.layoutRowHeight = rowHeight;

      updateStore("layoutRowHeight", rowHeight);
    },
    setStreamType(state, streamType) {
      state.streamType = streamType;

      updateStore("streamType", streamType);
    },
    setPlayerType(state, playerType) {
      state.playerType = playerType;

      updateStore("playerType", playerType);
    },
    setPlayback(state, playback) {
      state.playback = playback;
    },
    updateToken(state, token) {
      updateStore("token", token);

      state.token = token;
    },
    authError(state, error) {
      state.authError = error;
    },
    logout(state) {
      localStorage.removeItem("token");

      state.token = "";
      state.authError = "";
    }
  }
});
