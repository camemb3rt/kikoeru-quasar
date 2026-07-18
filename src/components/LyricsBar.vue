<template>
    <q-card
      id="draggable"
      v-show="lyricAvailable"
      @mouseenter="showSizeSlider"
      @mouseleave="hideSizeSlider"
      @mousemove="showSizeSlider"
      @wheel.prevent="adjustLyricFontSize"
    >
        <div
          id="lyricsBar"
          class="text-center text-bold ellipsis-2-lines q-mb-md"
          :style="lyricStyle"
          @mousedown="onCursorDown"
          @mouseup="onCursorUp"
          @touchstart="onCursorDown"
          @touchend="onCursorUp"
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
  const requestedX = touch.clientX - that.startX + rect.width / 2
  const requestedY = touch.clientY - that.startY
  const minX = rect.width / 2
  const maxX = Math.max(minX, window.innerWidth - rect.width / 2)
  const maxY = Math.max(0, window.innerHeight - rect.height)
  const eleX = Math.min(Math.max(requestedX, minX), maxX)
  const eleY = Math.min(Math.max(requestedY, 0), maxY)

  that.draggable.style.left = eleX + 'px'
  that.draggable.style.top = eleY + 'px'
  that.draggable.style.bottom = 'auto'
  that.$q.localStorage.set('lyricBarPosition', { left: eleX, top: eleY, centered: true })
  that.captureLyricBottom()
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

    isMobile() {
      return this.$q.platform.is.mobile
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
      lyricBottom: null,
      lyricsResizeObserver: null,

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
      this.captureLyricBottom()
    },

    onCursorUp(ev) {
      if (ev) ev.preventDefault()
      if (!this.beTouched) return
      this.beTouched = false
      setTimeout(() => this.hideSizeSlider(), 300)
    },

    onGlobalCursorUp() {
      this.onCursorUp()
      this.onSizeSliderUp()
    },

    showSizeSlider() {
      this.sizeSliderVisible = true
    },

    hideSizeSlider() {
      if (this.isMobile) return
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

    captureLyricBottom() {
      const lyricsBar = document.getElementById('lyricsBar')
      if (!lyricsBar || !this.lyricAvailable) return
      const rect = lyricsBar.getBoundingClientRect()
      if (rect.height) this.lyricBottom = rect.bottom
    },

    keepLyricBottomAnchored() {
      if (this.beTouched || !this.lyricAvailable || !this.draggable) return

      const lyricsBar = document.getElementById('lyricsBar')
      if (!lyricsBar) return

      const lyricsRect = lyricsBar.getBoundingClientRect()
      if (!lyricsRect.height) return

      if (this.lyricBottom !== null && Math.abs(lyricsRect.bottom - this.lyricBottom) > 0.5) {
        const draggableRect = this.draggable.getBoundingClientRect()
        const requestedTop = draggableRect.top + this.lyricBottom - lyricsRect.bottom
        const maxTop = Math.max(0, window.innerHeight - draggableRect.height)
        const top = Math.min(Math.max(requestedTop, 0), maxTop)

        this.draggable.style.top = top + 'px'
        this.draggable.style.bottom = 'auto'
      }

      this.captureLyricBottom()
    },

    applySavedPosition() {
      if (!this.savedLyricBarPosition) return

      this.$nextTick(() => {
        const position = this.savedLyricBarPosition
        const rect = this.draggable.getBoundingClientRect()
        const savedLeft = Number.isFinite(position.left) ? position.left : window.innerWidth / 2
        const requestedLeft = position.centered ? savedLeft : savedLeft + rect.width / 2
        const requestedTop = Number.isFinite(position.top) ? position.top : rect.top
        const minLeft = rect.width / 2
        const maxLeft = Math.max(minLeft, window.innerWidth - rect.width / 2)
        const maxTop = Math.max(0, window.innerHeight - rect.height)
        const left = Math.min(Math.max(requestedLeft, minLeft), maxLeft)
        const top = Math.min(Math.max(requestedTop, 0), maxTop)

        this.draggable.style.left = left + 'px'
        this.draggable.style.top = top + 'px'
        this.draggable.style.bottom = 'auto'
        this.captureLyricBottom()
      })
    },

    setLyricFontSize(size) {
      this.SET_LYRIC_FONT_SIZE(size)
      this.$q.localStorage.set('lyricFontSize', size)
    }
  },

  watch: {
    lyricAvailable(available) {
      if (available) {
        this.applySavedPosition()
        if (this.isMobile) this.showSizeSlider()
      } else {
        this.lyricBottom = null
        this.sizeSliderVisible = false
      }
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
    this.$nextTick(() => {
      const lyricsBar = document.getElementById('lyricsBar')
      if (window.ResizeObserver && lyricsBar) {
        this.lyricsResizeObserver = new ResizeObserver(() => this.keepLyricBottomAnchored())
        this.lyricsResizeObserver.observe(lyricsBar)
      }
      this.captureLyricBottom()
      if (this.isMobile && this.lyricAvailable) this.showSizeSlider()
    })
    addEventListener('mousemove', onCursorMove(this), false)
    addEventListener('touchmove', onCursorMove(this), false)
    addEventListener('mouseup', this.onGlobalCursorUp, false)
    addEventListener('touchend', this.onGlobalCursorUp, false)
  },

  beforeDestroy() {
    if (this.lyricsResizeObserver) this.lyricsResizeObserver.disconnect()
    removeEventListener('mouseup', this.onGlobalCursorUp, false)
    removeEventListener('touchend', this.onGlobalCursorUp, false)
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
    position: fixed;
    text-align: center;
    transform: translateX(-50%);
    z-index: 3001;
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
