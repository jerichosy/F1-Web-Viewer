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
    <div ref="videoPlayer" class="group bitmovin-video" :class="{ hide: !initialized }" />
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
  import player from "bitmovin-player";
  import { mapGetters } from "vuex";

  import F1TV_API from "@/lib/F1TV_API";

  import BaseIconButton from "@/components/BaseIconButton";

  const playerConfig = {
    key: window.PLAYER_LICENSE_KEY || localStorage.PLAYER_LICENSE_KEY || "BITMOVIN_PLAYER_LICENSE_KEY",
    playback: {
      muted: true,
      autoplay: false
    },
    error: function (err) {
      console.log(err);
      this.$notify({
        title: err.name,
        text: err.message,
        type: 'error',
        duration: 30000,
      })
    },
    location: {
      ui: 'https://cdn.bitmovin.com/player/web/8/bitmovinplayer-ui.js',
      ui_css: 'https://cdn.bitmovin.com/player/web/8/bitmovinplayer-ui.css',
    },
  }

  export default {
    name: "FeedBitmovin",
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
        if (!this.player || !this.initialized) return;

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
        this.player = new player.Player(this.$refs.videoPlayer, playerConfig);
        this.updateSource();
      },
      async updateSource() {
        if (!this.token) return;
        try {
          const res = await F1TV_API.getAuthenticatedUrl(this.playbackUrl, this.token);
          this.initialized = true;
          if (this.player && res.data?.resultObj?.url) {
            let url = res.data.resultObj.url;
            if (!process.env.IS_ELECTRON) {
              url = "/proxy/" + url;
            }
            if (res.data.resultObj.streamType === "DASH" || res.data.resultObj.streamType.endsWith("DASHWV")) {
              this.player.load({
                dash: url,
                drm: {
                  widevine: {
                    headers: {
                      ascendontoken: this.token
                    },
                    LA_URL: "/proxy/" + res.data.resultObj.laURL,
                  },
                }
              });
            } else {
              this.player.load({
                hls: url,
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
          this.$notify({
            title: err.name,
            text: err.message,
            type: 'error',
            duration: 30000,
          })
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
  .bmpui-ui-watermark {
    display: none;
  }

  .bitmovin-video > video {
    width: 100%;
    height: 100%;
    background: black;
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
