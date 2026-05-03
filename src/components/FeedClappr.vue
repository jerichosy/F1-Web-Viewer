<template>
  <div class="group">
    <div class="vue-draggable-handle modifier">
      <BaseIconButton icon="ri-drag-move-line" />
    </div>
    <div class="right-handle modifier">
      <BaseIconButton
        icon="ri-play-line"
        iconHover="ri-play-fill"
        iconToggle="ri-pause-line"
        :value="playback"
        toggle
        @click="(e, toggled) => $emit('togglePlayback', toggled)"
      />
      <BaseIconButton icon="ri-timer-line" iconHover="ri-timer-fill" @click="$emit('syncFeeds', playerTime)" />
      <BaseIconButton
        icon="ri-pushpin-line"
        iconToggle="ri-pushpin-2-fill"
        iconHover="ri-pushpin-2-line"
        iconToggleHover="ri-pushpin-2-fill"
        toggle
        :initValue="this.static"
        @click="$emit('togglePin')"
      />
      <BaseIconButton icon="ri-close-line" @click="$emit('delete')" />
    </div>
    <div ref="videoPlayer" class="container-video" :class="{ hide: !initialized }" />
    <notifications position="bottom right" width="100%">
      <template v-slot="{ item, close }">
        <div class="notification is-danger">
          <p class="title">
            {{ item.title }}
          </p>
          <button class="delete" @click="close" />
          <div v-html="props.item.text"/>
        </div>
      </template>
    </notifications>
  </div>
</template>

<script>
  import Clappr from "clappr";
  import DashShakaPlayback from "dash-shaka-playback";
  import { mapGetters } from "vuex";

  import F1TV_API from "@/lib/F1TV_API";

  import BaseIconButton from "@/components/BaseIconButton";

  export default {
    name: "FeedClappr",
    components: {
      BaseIconButton
    },
    props: {
      options: Object,
      playbackUrl: String,
      static: Boolean,
      live: Boolean,
      time: {
        type: Number,
        default: 0
      }
    },
    data() {
      return {
        initialized: false,
        player: null
      };
    },
    computed: {
      playerTime() {
        return this.player?.getCurrentTime();
      },
      ...mapGetters(["token", "playback"])
    },
    watch: {
      options() {
        if (!this.player) {
          this.initPlayer();
        }
      },
      time(time) {
        this.player?.seek(time);
      },
      playbackUrl() {
        this.updateSource();
      },
      token() {
        this.updateSource();
      },
      playback(state) {
        if (!this.player) return;

        if (state) {
          this.player.play();
        } else {
          this.player.pause();
        }
      }
    },
    methods: {
      clicked(event) {
        this.$emit("click", event.target);
      },
      async initPlayer() {
        this.player = new Clappr.Player({
          plugins: [DashShakaPlayback],
          parent: this.$refs.videoPlayer,
          width: '100%',
          height: '100%',
        });
        this.updateSource();
      },
      async updateSource() {
        if (!this.token) return;
        try {
          const {token} = this;
          const res = await F1TV_API.getAuthenticatedUrl(this.playbackUrl, token);
          this.initialized = true;
          if (this.player && res.data?.resultObj?.url) {
            let url = "/proxy/" + res.data.resultObj.url;
            if (res.data.resultObj.streamType === "DASH" || res.data.resultObj.streamType === "DASHWV") {
              this.player.configure({
                source: url,
                shakaOnBeforeLoad: function(shaka_player) {
                  shaka_player.getNetworkingEngine().registerRequestFilter(function(type, request) {
                    request.headers.ascendontoken = token;
                  });
                },
                shakaConfiguration: {
                  drm: {
                    servers: {
                      'com.widevine.alpha': "/proxy/" + res.data.resultObj.laURL,
                    }
                  }
                },
              });
            } else {
              this.player.configure({
                source: url,
              });
            }
          } else if (res.data.errorDescription) {
            this.$notify({
              title: res.data.errorDescription,
              text: res.data.message,
              type: 'error',
              duration: 30000,
            })
          }
        } catch (err) {
          console.error(err);
        }
      }
    },
    mounted() {
      if (this.options) {
        this.initPlayer();
      }
    },
    beforeDestroy() {
      if (this.player) {
        this.player.destroy();
      }
    }
  };
</script>

<style lang="scss">

  .container-video > video {
    width: 100%;
    height: 100%;
    background: black;
  }

  .container-video {
    width: 100%;
    height: 100%;
  }

  .group {
    width: 100%;
    height: 100%;
  }

  .hide {
    background: transparent !important;
  }

  .modifier {
    display: none;
    position: absolute;
    z-index: 100;
    color: white;
  }

  .vue-grid-item:hover .modifier {
    display: block;
  }

  .right-handle {
    right: 0;
  }

  .vue-resizable-handle {
    display: none;
    background: url("~@/assets/resize-icon.svg") !important;
    background-position: 100% 100% !important;
    background-repeat: no-repeat !important;
    background-origin: content-box !important;
    -webkit-box-sizing: border-box !important;
  }

  .vue-grid-item:hover .vue-resizable-handle {
    display: block !important;
  }
</style>
