<template>
    <q-card
      id="draggable"
      v-show="lyricAvailable"
      @mouseenter="showSizeSlider"
      @mouseleave="hideSizeSlider"
      @mousemove="showSizeSlider"
      @mousedown="onCursorDown"
      @mouseup="onCursorUp"
      @touchstart="onCursorDown"
      @touchend="onCursorUp"
      @wheel.prevent="adjustLyricFontSize"
    >
        <div
          id="lyricsBar"
          class="text-center text-bold ellipsis-2-lines q-mb-md"
          :style="lyricStyle"
          @wheel.prevent="adjustLyricFontSize"
        >
            <span id="lyric">
              {{currentLyric}}
            </span>
        </div>
        <div
          v-show="sizeSliderVisible"
          id="lyricsSizeControl"
          @mousedown.capture="onSizeSliderDown"
          @mouseup.capture="onSizeSliderUp"
          @touchstart.capture="onSizeSliderDown"
          @touchend.capture="onSizeSliderUp"
          @mousedown.stop="onSizeSliderDown"
          @mouseup.stop="onSizeSliderUp"
          @touchstart.stop="onSizeSliderDown"
          @touchend.stop="onSizeSliderUp"
          @wheel.prevent="adjustLyricFontSize"
        >
            <q-slider
              v-model="lyricFontSize"
              class="q-px-md q-mt-xs"
              :min="12"
              :max="56"
              :step="1"
              color="grey-6"
              @input="setLyricFontSize"
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
  const rect = that.draggable.getBoundingClientRect()
  const eleX = touch.clientX - that.startX + rect.width / 2
  const eleY = touch.clientY - that.startY

  that.draggable.style.left = eleX + 'px'
  that.draggable.style.top = eleY + 'px'
  that.draggable.style.bottom = 'auto'
  that.$q.localStorage.set('lyricBarPosition', { left: eleX, top: eleY, centered: true })
  that.showSizeSlider()

}

export default {
  name: 'LyricsBar',

  computed: {
    ...mapState('AudioPlayer', [
      'currentLyric',
      'lyricFontColor',
      'lyricAvailable'
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
      savedLyricBarPosition: null,
      sizeSliderInteracting: false,
      sizeSliderVisible: false,

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
      this.showSizeSlider()

      // 移动端使用 ev.touches[0]
      const touch = this.getTouch(ev)
      const rect = this.draggable.getBoundingClientRect()
      this.startX = touch.clientX - rect.left
      this.startY = touch.clientY - rect.top
    },

    onCursorUp(ev) {
      ev.preventDefault()
      this.beTouched = false
      setTimeout(() => this.hideSizeSlider(), 300)
    },

    showSizeSlider() {
      this.sizeSliderVisible = true
    },

    hideSizeSlider() {
      if (!this.beTouched && !this.sizeSliderInteracting) {
        this.sizeSliderVisible = false
      }
    },

    onSizeSliderDown() {
      this.sizeSliderInteracting = true
      this.showSizeSlider()
    },

    onSizeSliderUp() {
      if (!this.sizeSliderInteracting) return
      this.sizeSliderInteracting = false
    },

    adjustLyricFontSize(event) {
      const direction = event.deltaY < 0 ? 1 : -1
      const size = Math.min(56, Math.max(12, this.lyricFontSize + direction))
      this.lyricFontSize = size
      this.setLyricFontSize(size)
    },

    applySavedPosition() {
      if (!this.savedLyricBarPosition) return

      this.$nextTick(() => {
        const position = this.savedLyricBarPosition
        const rect = this.draggable.getBoundingClientRect()
        const left = position.centered ? position.left : position.left + rect.width / 2
        const top = Number.isFinite(position.top) ? position.top : rect.top

        this.draggable.style.left = left + 'px'
        this.draggable.style.top = top + 'px'
        this.draggable.style.bottom = 'auto'
      })
    },

    setLyricFontSize(size) {
      this.SET_LYRIC_FONT_SIZE(size)
      this.$q.localStorage.set('lyricFontSize', size)
    }
  },

  watch: {
    lyricAvailable(available) {
      if (available) this.applySavedPosition()
    }
  },

  mounted() {
    this.savedLyricBarPosition = this.$q.localStorage.getItem('lyricBarPosition')
    if (this.lyricAvailable) this.applySavedPosition()
    if (this.$q.localStorage.has('lyricFontSize')) {
      this.lyricFontSize = this.$q.localStorage.getItem('lyricFontSize')
      this.SET_LYRIC_FONT_SIZE(this.lyricFontSize)
    }
    if (this.$q.localStorage.has('lyricFontColor')) {
      this.SET_LYRIC_FONT_COLOR(this.$q.localStorage.getItem('lyricFontColor'))
    }
    addEventListener('mousemove', onCursorMove(this), false)
    addEventListener('touchmove', onCursorMove(this), false)
    addEventListener('mouseup', this.onSizeSliderUp, false)
    addEventListener('touchend', this.onSizeSliderUp, false)
  },

  beforeDestroy() {
    removeEventListener('mouseup', this.onSizeSliderUp, false)
    removeEventListener('touchend', this.onSizeSliderUp, false)
  }
}
</script>

<style lang="scss">
  .moveable-line {
    background-color: transparent !important;
  }
  #draggable {
    background-color: transparent;
    bottom: 48px;
    box-shadow: none;
    display: inline-block;
    left: 50%;
    max-width: 100vw;
    overflow: visible;
    padding: 12px;
    position: absolute;
    text-align: center;
    transform: translateX(-50%);
    z-index: 2;
  }

  #lyricsBar {
    display: inline-block;
    max-width: 100%;
    min-width: 1vw;
    position: relative;
    text-align: center;
  }

  #lyricsSizeControl {
    margin: 0 auto;
    width: 320px;
  }

  #lyric {
    background-color: rgba($grey-4, $alpha: 0.6);
    border-radius: 0.5rem;
    display: inline-block;
    padding: 0.25rem 0.75rem;
    text-align: center;
  }
</style>
