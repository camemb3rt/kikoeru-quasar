<template>
  <div class="q-pa-md q-gutter-md flex-center" style="max-width: 700px; margin: auto;">
    <q-toolbar>
      <q-toolbar-title>General settings</q-toolbar-title>
    </q-toolbar>
    <q-card class="q-py-none">
      <q-list separator>
        <!-- 倒带跳跃秒数设置 -->
        <q-item>
          <q-item-section avatar>
            <q-icon size="md" name="library_music" />
          </q-item-section>
          <q-item-section main>
            <q-item-label>Number of works per page</q-item-label>
            <q-item-label class="text-caption text-grey">Enter a number and press enter to update</q-item-label>
          </q-item-section>
          <q-item-section side>
            <q-input input-class="text-right" type="number" v-model="pageSize" @keyup.enter="setPageSize" />
          </q-item-section>
        </q-item>
      </q-list>
    </q-card>

    <q-toolbar>
      <q-toolbar-title>Player settings</q-toolbar-title>
    </q-toolbar>
    <q-card class="q-py-none">
      <q-list separator>
        <!-- 倒带跳跃秒数设置 -->
        <q-item>
          <q-item-section avatar>
            <q-icon size="md" name="fast_rewind" />
          </q-item-section>
          <q-item-section main>
            <q-item-label>Rewind seek time</q-item-label>
          </q-item-section>
          <q-item-section side>
            <q-select borderless v-model="rewindSeekTimeOption" :options="seekTimeOptions" @input="setRewindSeekTime" />
          </q-item-section>
        </q-item>
        <!-- 前进跳跃秒数设置 -->
        <q-item>
          <q-item-section avatar>
            <q-icon flat dense size="md" name="fast_forward" />
          </q-item-section>
          <q-item-section main>
            <q-item-label>Forward seek time</q-item-label>
          </q-item-section>
          <q-item-section side>
            <q-select
              borderless
              v-model="forwardSeekTimeOption"
              :options="seekTimeOptions"
              @input="setForwardSeekTime"
            />
          </q-item-section>
        </q-item>
        <q-item>
          <q-item-section avatar>
            <q-icon flat dense size="md" name="image_search" />
          </q-item-section>
          <q-item-section main>
            <q-item-label>Enable media viewer</q-item-label>
            <q-item-label class="text-caption text-grey">Enabling this feature may reduce performance, please only view images/videos</q-item-label>
          </q-item-section>
          <q-item-section side>
            <q-toggle borderless v-model="isViewer" @input="setIsViewer" />
          </q-item-section>
        </q-item>
        <q-item>
          <q-item-section avatar>
            <q-icon flat dense size="md" name="format_color_text" />
          </q-item-section>
          <q-item-section main>
            <q-item-label>Lyric font color</q-item-label>
            <q-item-label class="text-caption text-grey">Changes the color of the draggable lyric overlay</q-item-label>
          </q-item-section>
          <q-item-section side>
            <input v-model="lyricFontColor" type="color" aria-label="Lyric font color" @input="setLyricFontColor">
          </q-item-section>
        </q-item>
      </q-list>
    </q-card>

    <span class="flex flex-center text-grey">&nbsp;</span>
  </div>
</template>

<script>
import NotifyMixin from '../mixins/Notification.js';
import { mapMutations } from 'vuex';

export default {
  name: 'Settings',

  mixins: [NotifyMixin],

  data() {
    return {
      config: {},
      // 页面数量设置
      pageSize: 12,
      // 倒带、前进秒数设置
      rewindSeekTimeOption: { label: '5 seconds', value: 5 },
      forwardSeekTimeOption: { label: '30 seconds', value: 30 },
      seekTimeOptions: [
        { label: '5 seconds', value: 5 },
        { label: '10 seconds', value: 10 },
        { label: '30 seconds', value: 30 }
      ],
      // 媒体查看器是否启用
      isViewer: true,
      lyricFontColor: '#9c27b0'
    };
  },

  mounted() {
    if (this.$q.localStorage.has('pageSize')) {
      this.pageSize = this.$q.localStorage.getItem('pageSize');
    }
    if (this.$q.localStorage.has('rewindSeekTime')) {
      const rewindSeekTime = this.$q.localStorage.getItem('rewindSeekTime');
      this.rewindSeekTimeOption = this.seekTimeOptions.find(item => item.value === rewindSeekTime);
      this.SET_REWIND_SEEK_TIME(rewindSeekTime);
    }
    if (this.$q.localStorage.has('forwardSeekTime')) {
      const forwardSeekTime = this.$q.localStorage.getItem('forwardSeekTime');
      this.forwardSeekTimeOption = this.seekTimeOptions.find(item => item.value === forwardSeekTime);
      this.SET_FORWARD_SEEK_TIME(forwardSeekTime);
    }
    if (this.$q.localStorage.has('isViewer')) {
      this.isViewer = this.$q.localStorage.getItem('isViewer');
    }
    if (this.$q.localStorage.has('lyricFontColor')) {
      this.lyricFontColor = this.$q.localStorage.getItem('lyricFontColor');
      this.SET_LYRIC_FONT_COLOR(this.lyricFontColor);
    }
  },

  methods: {
    ...mapMutations('AudioPlayer', ['SET_REWIND_SEEK_TIME', 'SET_FORWARD_SEEK_TIME', 'SET_LYRIC_FONT_COLOR']),

    setPageSize() {
      console.log('set pageSize:', this.pageSize);
      this.$q.localStorage.set('pageSize', parseInt(this.pageSize));
      window.location.reload();
    },

    setRewindSeekTime(newRewindSeekTimeOption) {
      console.log('set rewindSeekTime:', newRewindSeekTimeOption.value);
      this.rewindSeekTimeOption = newRewindSeekTimeOption;
      this.SET_REWIND_SEEK_TIME(newRewindSeekTimeOption.value);
      this.$q.localStorage.set('rewindSeekTime', newRewindSeekTimeOption.value);
    },

    setForwardSeekTime(newForwardSeekTimeOption) {
      console.log('set forwardSeekTime:', newForwardSeekTimeOption.value);
      this.forwardSeekTimeOption = newForwardSeekTimeOption;
      this.SET_FORWARD_SEEK_TIME(newForwardSeekTimeOption.value);
      this.$q.localStorage.set('forwardSeekTime', newForwardSeekTimeOption.value);
    },

    setIsViewer(newIsViewer) {
      console.log('set Media Viewer:', newIsViewer);
      this.isViewer = newIsViewer;
      this.$q.localStorage.set('isViewer', this.isViewer);
    },

    setLyricFontColor() {
      this.SET_LYRIC_FONT_COLOR(this.lyricFontColor);
      this.$q.localStorage.set('lyricFontColor', this.lyricFontColor);
    }
  }
};
</script>
<style lang="scss">
.player-settings {
  // 宽度 > $breakpoint-sm-min
  @media (min-width: $breakpoint-sm-min) {
    width: 330px;
    margin: 0px 10px 10px 0px;
    // border-radius: 8px;
  }

  // 宽度 < $breakpoint-xs-max (599px)
  @media (max-width: $breakpoint-xs-max) {
    width: 100%;
    height: 100%;
    border-radius: 0;
  }

  transition: 0.6s;
  overflow: hidden;

  display: flex;
  flex-direction: column;
}
</style>
