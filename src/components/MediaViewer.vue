<template>
  <div>
    <q-card class="fixed-center q-pa-none q-ma-none media-viewer">
      <!-- title -->
      <q-card-section class="row justify-between items-center q-pa-sm">
        <div>
          <q-btn flat dense icon="help">
            <q-tooltip>
              <div class="text-subtitle2">
                <q-icon dense name="auto_awesome_motion" />
                Show thumbnails
              </div>
              <div class="text-subtitle2">
                <q-icon name="pageview" />
                Open in new window
              </div>
              <div class="text-subtitle2">
                <q-icon name="download" />
                Download
              </div>
              <div class="text-subtitle2">
                <q-icon name="open_in_full" />
                Fullscreen
              </div>
            </q-tooltip>
          </q-btn>
        </div>
        <div>
          <div class="text-subtitle1 text-center ellipsis absolute-center">
            {{ files[currentIndex].title }}
          </div>
        </div>
        <div>
          <q-btn flat dense icon="close" @click="$emit('close')" />
        </div>
      </q-card-section>
      <!-- content -->
      <q-card-section
        class="row justify-center items-center q-pa-md content-section"
        :class="{
          dark: $q.dark.isActive
        }"
      >
        <div class="absolute-left q-ml-md">
          <q-btn flat dense icon="arrow_left" @click="previous" style="top: 50%; z-index: 1;" />
        </div>
        <!-- 中心大图/视频 -->
        <div class="row justify-center items-center content-container" ref="fullscreenContainer">
          <q-img
            v-if="files[currentIndex].type === 'image'"
            id="image"
            class="content"
            :src="getMediaUrl(files[currentIndex])"
            :style="contentStyle"
            @dblclick="fullscreen"
            contain
          />
          <video
            v-else
            id="video"
            class="content"
            :src="getMediaUrl(files[currentIndex])"
            :style="contentStyle"
            @play="videoPlaying = true"
            @pause="videoPlaying = false"
            @ended="videoPlaying = false"
            controls
            autoplay
          />
        </div>
        <div class="absolute-right q-mr-md">
          <q-btn flat dense icon="arrow_right" @click="next" style="top: 50%; z-index: 1;" />
        </div>
      </q-card-section>
      <q-card-section
        v-if="showThumbnail"
        class="row justify-center items-center q-pa-none thumbnail-section"
        :class="{ dark: $q.dark.isActive }"
      >
        <q-scroll-area class="row justify-center items-center thumbnail" ref="scrollArea">
          <div class="row no-wrap row justify-center items-center">
            <div
              ref="thumbnails"
              class="q-mr-sm thumbnail-item"
              v-for="(file, index) in files"
              :key="index"
              :class="{
                active: currentIndex === index,
                dark: $q.dark.isActive
              }"
              @click="clickThumbnailItem(index)"
            >
              <q-img v-if="file.type === 'image'" :src="getMediaUrl(file)" contain style="height: 100%;" />
              <div v-else style="width: 100%; height: 100%;">
                <video id="video" class="content" :src="getMediaUrl(file)" style="width: 100%; height: 100%;" />
                <q-icon :name="videoPlayingIcon" class="play-button" :class="{ dark: $q.dark.isActive }" />
              </div>

              <div class="text-center ellipsis thumbnail-title" :class="{ dark: $q.dark.isActive }">
                {{ file.title }}
              </div>
            </div>
          </div>
        </q-scroll-area>
      </q-card-section>
      <!-- controls -->
      <q-card-section class="row justify-center items-center q-ma-sm">
        <div class="absolute-left">
          <q-btn flat dense icon="auto_awesome_motion" @click="thumbnail" />
          <q-btn flat dense icon="pageview" @click="newTabPage" />
          <q-btn flat dense icon="download" @click="download" />
        </div>
        <div class="text-subtitle1 absolute-center">{{ currentIndex + 1 }} / {{ files.length }}</div>
        <div class="absolute-right">
          <q-btn flat dense icon="open_in_full" @click="fullscreen" />
        </div>
      </q-card-section>
    </q-card>
  </div>
</template>

<script>
import { AppFullscreen } from 'quasar';
import { mapState } from 'vuex';

export default {
  name: 'MediaViewer',

  props: {
    files: {
      type: Array,
      required: true
    },
    index: {
      type: Number,
      required: true
    }
  },

  data() {
    return {
      currentIndex: this.index,
      currentSize: '',
      showThumbnail: false,
      showInfo: false,
      videoPlaying: false
    };
  },

  computed: {
    ...mapState('AudioPlayer', ['playing']),

    contentStyle() {
      return {
        height: AppFullscreen.isActive ? '100%' : 'auto',
        maxHeight: AppFullscreen.isActive ? '100%' : 'calc(100vh - 200pt)'
      };
    },

    videoPlayingIcon() {
      return this.videoPlaying ? 'pause' : 'play_arrow';
    }
  },

  mounted() {
    document.addEventListener('keydown', this.handleKeydown);
    document.addEventListener('wheel', this.handleWheel);
    if (this.files[this.currentIndex].type === 'video' && this.playing) {
      this.$store.commit('AudioPlayer/TOGGLE_PLAYING');
    }
  },

  beforeDestroy() {
    document.removeEventListener('keydown', this.handleKeydown);
    document.removeEventListener('wheel', this.handleWheel);
  },

  methods: {
    scrollToThumbnail(idx) {
      this.$nextTick(() => {
        const thumbnail = this.$refs.thumbnails[idx]; // 当前缩略图元素
        const scrollArea = this.$refs.scrollArea.$el; // 滚动区域元素

        if (thumbnail && scrollArea) {
          // 获取缩略图的偏移量
          const thumbnailOffsetLeft = thumbnail.offsetLeft;
          const scrollAreaWidth = scrollArea.clientWidth;
          const thumbnailWidth = thumbnail.offsetWidth;

          // 计算需要滚动的位置，让缩略图在视图中央
          const scrollPosition = thumbnailOffsetLeft - scrollAreaWidth / 2 + thumbnailWidth / 2;

          // console.log('scroll', scrollPosition);
          // 设置滚动行为，让缩略图居中
          this.$refs.scrollArea.setScrollPosition('horizontal', scrollPosition, 300);
        }
      });
    },

    getMediaUrl(file, isDownload = false) {
      const token = this.$q.localStorage.getItem('jwt-token') || '';
      // Fallback to old API for an old backend
      const url = `${isDownload ? file.mediaDownloadUrl : file.mediaStreamUrl}?token=${token}`.replace("#", "%23");
      return url;
    },

    previous() {
      if (this.currentIndex > 0) {
        this.currentIndex--;
      } else {
        this.currentIndex = this.files.length - 1;
      }
      if (this.showThumbnail) {
        this.scrollToThumbnail(this.currentIndex);
      }
    },

    next() {
      if (this.currentIndex < this.files.length - 1) {
        this.currentIndex++;
      } else {
        this.currentIndex = 0;
      }
      if (this.showThumbnail) {
        this.scrollToThumbnail(this.currentIndex);
      }
    },

    newTabPage() {
      const file = this.files[this.currentIndex];
      const link = document.createElement('a');
      link.href = this.getMediaUrl(file);
      link.target = '_blank';
      link.click();
    },

    download() {
      const file = this.files[this.currentIndex];
      const link = document.createElement('a');
      link.href = this.getMediaUrl(file, true);
      link.target = '_blank';
      link.click();
    },

    fullscreen() {
      if (this.files[this.currentIndex].type === 'audio') {
        const video = document.getElementById('video');
        if (video.requestFullscreen) {
          video.requestFullscreen();
        } else if (video.webkitRequestFullscreen) {
          // Safari
          video.webkitRequestFullscreen();
        } else if (video.msRequestFullscreen) {
          // IE/Edge
          video.msRequestFullscreen();
        }
      } else {
        const container = this.$refs.fullscreenContainer;
        try {
          if (AppFullscreen.isActive) {
            AppFullscreen.exit();
          } else {
            AppFullscreen.request(container);
          }
        } catch (error) {
          console.error('Failed to enter fullscreen mode:', error);
        }
      }
    },

    thumbnail() {
      this.showThumbnail = !this.showThumbnail;
      if (this.showThumbnail) this.scrollToThumbnail(this.currentIndex);
    },

    clickThumbnailItem(index) {
      this.currentIndex = index;
      this.scrollToThumbnail(this.currentIndex);
      if (this.files[this.currentIndex].type === 'audio') {
        this.$nextTick(() => {
          const video = document.getElementById('video');
          if (this.videoPlaying) {
            video.pause();
          } else {
            video.play();
          }
        });
      }
    },

    handleWheel(event) {
      if (event.deltaY < 0) {
        this.previous();
      } else if (event.deltaY > 0) {
        this.next();
      }
    },

    handleKeydown(event) {
      if (event.key === 'PageDown') {
        this.previous();
      } else if (event.key === 'PageUp') {
        this.next();
      }
    }
  }
};
</script>
<style lang="scss" scoped>
.media-viewer {
  // 宽度 > $breakpoint-sm-min
  @media (min-width: $breakpoint-sm-min) {
    width: 1200px;
  }

  // 宽度 < $breakpoint-xs-max (599px)
  @media (max-width: $breakpoint-xs-max) {
    width: 95%;
  }

  border-radius: 8px;

  transition: 0.6s;

  display: flex;
  flex-direction: column;
}
.content-section {
  background-color: #eeeeee;
}
.content-container {
  width: 90%;
  height: 100%;
}
.content {
  width: 100%;
  object-fit: contain;
  z-index: 0;
}
.thumbnail-section {
  background-color: #eeeeee;
}
.thumbnail {
  @media (min-width: $breakpoint-sm-min) {
    width: 100%;
    max-width: 100%;
  }

  // 宽度 < $breakpoint-xs-max (599px)
  @media (max-width: $breakpoint-xs-max) {
    width: 95%;
    max-width: 95%;
  }
  height: 100px;
  overflow-x: auto;
  will-change: transform;
}
.thumbnail-item {
  position: relative;
  width: 120px;
  height: 80px;
  border: 2px solid #bbb;
  background-color: #eeeeee;
  padding: 2px;
  border-radius: 4px;
  cursor: pointer;
}
.thumbnail-item.active {
  border-color: #1976d2;
}
.thumbnail-title {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  padding: 4px 8px;
  background-color: rgba(255, 255, 255, 0.5); /* 半透明灰色背景 */
  color: black;
  font-size: 12px;
  text-align: center;
  box-sizing: border-box;
}
.dark {
  background-color: #121212;
}
.dark.thumbnail-item {
  background-color: #121212;
  border-color: #555;
  color: white;
}
.dark.thumbnail-item.active {
  border-color: #1976d2;
}
.dark.thumbnail-title {
  background-color: rgba(0, 0, 0, 0.5);
  color: white;
}
.play-button {
  @media (min-width: $breakpoint-sm-min) {
    top: 38%;
  }

  // 宽度 < $breakpoint-xs-max (599px)
  @media (max-width: $breakpoint-xs-max) {
    top: 34%;
  }
  position: absolute;
  left: 50%;
  transform: translate(-50%, -50%);
  font-size: 20px;
  color: #121212;
  background-color: rgba(255, 255, 255, 0.4); /* 半透明背景 */
  border-radius: 50%;
  padding: 6px;
  cursor: pointer;
  z-index: 2; /* 确保按钮在视频之上 */
}
.dark.play-button {
  color: rgb(206, 194, 194);
  background-color: rgba(0, 0, 0, 0.45);
}
</style>
