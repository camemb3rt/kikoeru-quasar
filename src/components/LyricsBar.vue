<template>
    <q-card
      id="draggable"
      @mousedown="onCursorDown"
      @mouseup="onCursorUp"
      @touchstart="onCursorDown"
      @touchend="onCursorUp"
    >
        <div id="lyricsBar" class="text-center text-bold ellipsis-2-lines q-mb-md absolute-bottom" :style="lyricStyle">
            <span id="lyric">
              {{currentLyric}}
            </span>
            <q-slider
              v-model="lyricFontSize"
              class="q-px-md q-mt-xs"
              :min="12"
              :max="56"
              :step="1"
              :label="true"
              :label-value="`${lyricFontSize}px`"
              color="purple"
              @input="setLyricFontSize"
              @mousedown.stop
              @touchstart.stop
            />
        </div>
    </q-card>
</template>

<script>
import { mapState, mapMutations } from 'vuex'

const onCursorMove = (that) => (ev) => {
  if (!that.beTouched) { return }

  // ev.preventDefault()
  const touch = that.getTouch(ev)

  // 计算 element 新位置坐标
  const eleX = touch.clientX - that.startX
  const eleY = touch.clientY - that.startY

  that.draggable.style.left = eleX + 'px'
  that.draggable.style.top = eleY + 'px'

}

export default {
  name: 'LyricsBar',

  computed: {
    ...mapState('AudioPlayer', [
      'currentLyric',
      'lyricFontColor'
    ]),

    draggable() {
      return document.getElementById('draggable')
    },

    lyricStyle() {
      return {
        color: this.lyricFontColor,
        fontSize: `${this.lyricFontSize}px`
      }
    }
  },

  data () {
    return {
      beTouched: false,

      // 鼠标按下时的位置
      startX: 0,
      startY: 0,
      lyricFontSize: 20
    }
  },

  methods: {
    ...mapMutations('AudioPlayer', ['SET_LYRIC_FONT_SIZE', 'SET_LYRIC_FONT_COLOR']),

    /**
     * @param {TouchEvent|MouseEvent} ev
     */
    getTouch(ev) {
      return ev.touches ? ev.touches[0] : ev;
    },

    onCursorDown(ev) {
      ev.preventDefault()
      this.beTouched = true

      // 移动端使用 ev.touches[0]
      const touch = this.getTouch(ev)
      this.startX = touch.clientX - this.draggable.offsetLeft
      this.startY = touch.clientY - this.draggable.offsetTop
    },

    onCursorUp(ev) {
      ev.preventDefault()
      this.beTouched = false
    },

    setLyricFontSize(size) {
      this.SET_LYRIC_FONT_SIZE(size)
      this.$q.localStorage.set('lyricFontSize', size)
    }
  },

  mounted() {
    if (this.$q.localStorage.has('lyricFontSize')) {
      this.lyricFontSize = this.$q.localStorage.getItem('lyricFontSize')
      this.SET_LYRIC_FONT_SIZE(this.lyricFontSize)
    }
    if (this.$q.localStorage.has('lyricFontColor')) {
      this.SET_LYRIC_FONT_COLOR(this.$q.localStorage.getItem('lyricFontColor'))
    }
    addEventListener('mousemove', onCursorMove(this), false)
    addEventListener('touchmove', onCursorMove(this), false)
  }
}
</script>

<style lang="scss">
  .moveable-line {
    background-color: transparent !important;
  }
  #lyricsBar {
    min-width: 1vw;
    position: absolute;
  }

  #lyric {
    background-color: rgba($grey-4, $alpha: 0.6);
    border-radius: 0.5rem;
    display: inline-block;
    padding: 0.25rem 0.75rem;
  }
</style>
