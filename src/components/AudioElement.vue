<template>
  <div class="col-12 q-pt-xs">
    <vue-plyr
      ref="plyr"
      :hideControls="false"
      :emit="['canplay', 'timeupdate', 'ended', 'seeked', 'playing', 'waiting', 'pause']"
      @canplay="onCanplay()"
      @timeupdate="onTimeupdate()"
      @ended="onEnded()"
      @seeked="onSeeked()"
      @playing="onPlaying()"
      @waiting="onWaiting()"
      @pause="onPause()"
    >
      <audio crossorigin="anonymous" >
        <source v-if="source" :src="source" />
      </audio>
    </vue-plyr>
  </div>
</template>

<script>
import Lyric from 'lrc-file-parser'
import { mapState, mapGetters, mapMutations } from 'vuex'
import NotifyMixin from '../mixins/Notification.js'

function subtitleToLrc(content) {
  const cueStartPattern = /^(?:(\d{1,2}):)?(\d{2}):(\d{2})[.,](\d{1,3})\s*-->/;
  const lines = String(content || '').replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n').split('\n');
  const lyricLines = [];

  for (let index = 0; index < lines.length; index += 1) {
    const match = lines[index].trim().match(cueStartPattern);
    if (!match) continue;

    const textLines = [];
    index += 1;
    while (index < lines.length && lines[index].trim() !== '') {
      textLines.push(lines[index].trim());
      index += 1;
    }

    const text = textLines.join(' ');
    if (text) {
      const totalMinutes = Number(match[1] || 0) * 60 + Number(match[2]);
      const milliseconds = String(match[4]).padEnd(3, '0').slice(0, 3);
      lyricLines.push(`[${String(totalMinutes).padStart(2, '0')}:${match[3]}.${milliseconds}] ${text}`);
    }
  }

  return lyricLines.join('\n');
}

export default {
  name: 'AudioElement',

  mixins: [NotifyMixin],

  data() {
    return {
      lrcObj: null,
      lrcAvailable: false,
    }
  },

  computed: {
    player () {
      return this.$refs.plyr.player
    },

    source () {
      // 从 LocalStorage 中读取 token
      const token = this.$q.localStorage.getItem('jwt-token') || ''
      // New API
      if (this.currentPlayingFile.mediaStreamUrl) {
        return `${this.currentPlayingFile.mediaStreamUrl}?token=${token}`.replace("#", "%23")
      } else {
        return ""
      }
    },

    mediaSessionArtwork () {
      const hash = this.currentPlayingFile.hash
      if (!hash || typeof window === 'undefined') return []

      const token = this.$q.localStorage.getItem('jwt-token') || ''
      const workId = hash.split('/')[0]
      const coverUrl = type => new URL(`/api/cover/${workId}?type=${type}&token=${token}`, window.location.origin).href
      return [
        { src: coverUrl('main'), sizes: '560x420', type: 'image/jpeg' },
        { src: coverUrl('sam'), sizes: '100x100', type: 'image/jpeg' }
      ]
    },

    ...mapState('AudioPlayer', [
      'playing',
      'queue',
      'queueIndex',
      'playMode',
      'muted',
      'volume',
      'sleepTime',
      'sleepMode',
      'rewindSeekTime',
      'forwardSeekTime',
      'rewindSeekMode',
      'forwardSeekMode'
    ]),

    ...mapGetters('AudioPlayer', [
      'currentPlayingFile'
    ])
  },

  watch: {
    playing (flag) {
      if (this.player.duration) {
        // 缓冲至可播放状态
        flag ? this.player.play() : this.player.pause()
      }
      this.updateMediaSessionPlaybackState(flag)
      // this.playLrc(flag);
    },

    // watch source -> media.load() -> canPlay -> player.play()
    source (url) {
      if (url) {
        // 加载新音频/视频文件
        this.player.media.load();
        this.loadLrcFile();
      }
      this.updateMediaSessionMetadata()
    },

    currentPlayingFile () {
      this.updateMediaSessionMetadata()
    },

    muted (flag) {
      // 切换静音状态
      this.player.muted = flag
    },

    volume (val) {
      // 屏蔽非法数值
      if (val < 0 || val > 1) {
        return
      }

      // 调节音量
      this.player.volume = val
    },
    rewindSeekMode(rewind) {
      if (rewind) {
        this.player.rewind(this.rewindSeekTime);
        this.SET_REWIND_SEEK_MODE(false);
      }
    },
    forwardSeekMode(forward) {
      if (forward) {
        this.player.forward(this.forwardSeekTime);
        this.SET_FORWARD_SEEK_MODE(false);
      }
    }
  },

  methods: {
    /**
     * 当 外部暂停（线控暂停、软件切换）、用户控制暂停、seek 时会触发本事件
     */
    onPause() {
      // console.log('onPause')
      this.playLrc(false)
      this.PAUSE()
    },
    /**
     * 当播放器真正开始播放时会触发本事件
     */
    onPlaying() {
      // console.log('playing')
      this.playLrc(true)
      this.PLAY()
    },
    /**
     * 当播放器缓冲区空，被迫暂停加载时会触发本事件
     */
    onWaiting() {
      // console.log('waiting')
      this.playLrc(false)
      this.PLAY()
    },
    ...mapMutations('AudioPlayer', [
      'SET_DURATION',
      'SET_CURRENT_TIME',
      'PAUSE',
      'PLAY',
      'SET_TRACK',
      'NEXT_TRACK',
      'PREVIOUS_TRACK',
      'SET_CURRENT_LYRIC',
      'SET_LYRIC_AVAILABLE',
      'SET_VOLUME',
      'CLEAR_SLEEP_MODE',
      'SET_REWIND_SEEK_MODE',
      'SET_FORWARD_SEEK_MODE'
    ]),

    canUseMediaSession () {
      return typeof navigator !== 'undefined' && 'mediaSession' in navigator && typeof window.MediaMetadata !== 'undefined'
    },

    updateMediaSessionMetadata () {
      if (!this.canUseMediaSession()) return

      const file = this.currentPlayingFile
      if (!file.hash) {
        navigator.mediaSession.metadata = null
        return
      }

      navigator.mediaSession.metadata = new window.MediaMetadata({
        title: file.title || file.workTitle || 'Kikoeru',
        artist: file.workTitle || '',
        album: file.workTitle || '',
        artwork: this.mediaSessionArtwork
      })
    },

    updateMediaSessionPlaybackState (playing) {
      if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return
      navigator.mediaSession.playbackState = playing ? 'playing' : 'paused'
    },

    setMediaSessionActionHandler (action, handler) {
      if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return
      try {
        navigator.mediaSession.setActionHandler(action, handler)
      } catch (_) {
        // Some browsers expose Media Session without supporting every action.
      }
    },

    setupMediaSession () {
      if (!this.canUseMediaSession()) return

      this.setMediaSessionActionHandler('play', () => {
        this.PLAY()
        this.player.play()
      })
      this.setMediaSessionActionHandler('pause', () => {
        this.player.pause()
        this.PAUSE()
      })
      this.setMediaSessionActionHandler('previoustrack', () => this.PREVIOUS_TRACK())
      this.setMediaSessionActionHandler('nexttrack', () => this.NEXT_TRACK())
      this.setMediaSessionActionHandler('seekbackward', details => {
        this.player.currentTime = Math.max(0, this.player.currentTime - (details.seekOffset || 10))
      })
      this.setMediaSessionActionHandler('seekforward', details => {
        this.player.currentTime = Math.min(this.player.duration, this.player.currentTime + (details.seekOffset || 10))
      })
      this.setMediaSessionActionHandler('seekto', details => {
        if (typeof details.seekTime === 'number') this.player.currentTime = details.seekTime
      })
      this.updateMediaSessionMetadata()
      this.updateMediaSessionPlaybackState(this.playing)
    },

    onCanplay () {
      // 缓冲至可播放状态时触发 (只有缓冲至可播放状态, 才能获取媒体文件的播放时长)
      this.SET_DURATION(this.player.duration)

      // 播放
      if (this.playing && this.player.currentTime !== this.player.duration) {
        this.player.play()
      }
      this.updateMediaSessionMetadata()
    },

    onTimeupdate () {
      // 当目前的播放位置已更改时触发
      this.SET_CURRENT_TIME(this.player.currentTime)
      if (this.sleepMode && this.sleepTime) {
        const currentTime = new Date()
        const currentHourStr = currentTime.getHours().toString().padStart(2, '0')
        const currentMinuteStr = currentTime.getMinutes().toString().padStart(2, '0')
        const sleepHourStr = this.sleepTime.match(/\d+/g)[0]
        const sleepMinuteStr = this.sleepTime.match(/\d+/g)[1]
        if (currentHourStr === sleepHourStr && currentMinuteStr === sleepMinuteStr) {
          this.PAUSE()
          this.CLEAR_SLEEP_MODE()
          // Persist sleep mode settings
          this.$q.sessionStorage.set('sleepTime', null)
          this.$q.sessionStorage.set('sleepMode', false)
        }
      }
      // if (!this.playing) {
      //   this.PLAY();
      // }
    },

    onEnded () {
      // 当前文件播放结束时触发
      switch (this.playMode.name) {
        case "all repeat":
          // 循环播放
          if (this.queueIndex === this.queue.length - 1) {
            this.SET_TRACK(0)
          } else {
            this.NEXT_TRACK()
          }
          break
        case "repeat once":
          // 单曲循环
          this.player.currentTime = 0
          this.player.play()
          this.PLAY()
          break
        case "shuffle": {
          // 随机播放
          const index = Math.floor(Math.random()*this.queue.length)
          this.SET_TRACK(index)
          if (index === this.queueIndex) {
            this.player.currentTime = 0
          }
          break
        }
        default:
          // 顺序播放
          if (this.queueIndex === this.queue.length - 1) {
            this.PAUSE()
          } else {
            this.NEXT_TRACK()
          }
      }
    },

    onSeeked() {
      // if (this.lrcAvailable) {
      //   this.lrcObj.play(this.player.currentTime * 1000);
      //   if (!this.playing) {
      //     this.lrcObj.pause();
      //   }
      // }
      if (!this.playing) {
        this.PLAY()
      }
    },

    isAudioPlaying () {
      if (!this.player) return false
      const media = this.player.media
      return media ? !media.paused && !media.ended : !this.player.paused
    },

    playLrc (playStatus) {
      if (this.lrcAvailable) {
        if (playStatus && this.isAudioPlaying()) {
          this.lrcObj.play(this.player.currentTime * 1000);
        } else {
          this.lrcObj.pause();
        }
      }
    },

    initLrcObj () {
        this.lrcObj = new Lyric({
          onPlay: (line, text) => {
            if (this.isAudioPlaying()) this.SET_CURRENT_LYRIC(text);
          },
        })
    },

    loadLrcFile () {
      this.lrcAvailable = false;
      this.SET_LYRIC_AVAILABLE(false);
      const token = this.$q.localStorage.getItem('jwt-token') || '';
      const fileHash = this.queue[this.queueIndex].hash;
      const url = `/api/media/check-lrc/${fileHash}?token=${token}`;

      this.$axios.get(url)
        .then((response) => {
          if (response.data.result) {
            // 有lrc歌词文件
            this.lrcAvailable = true;
            this.SET_LYRIC_AVAILABLE(true);
            const lrcUrl = `/api/media/stream/${response.data.mediaPath}?token=${token}`;
            const lyricExtension = (response.data.lyricExtension || '').toLowerCase();
            this.$axios.get(lrcUrl)
              .then(lyricResponse => {
                console.log('LRC file loaded');
                const lyricContent = ['.srt', '.vtt'].includes(lyricExtension)
                  ? subtitleToLrc(lyricResponse.data)
                  : lyricResponse.data;
                this.lrcObj.setLyric(lyricContent);
                this.playLrc(this.playing);
              });
          } else {
            // 无歌词文件
            this.lrcAvailable = false;
            this.SET_LYRIC_AVAILABLE(false);
            this.lrcObj.setLyric('');
            this.SET_CURRENT_LYRIC('');
          }
        })
        .catch((error) => {
          if (error.response) {
            // 请求已发出，但服务器响应的状态码不在 2xx 范围内
            if (error.response.status !== 401) {
              this.showErrNotif(error.response.data.error || `${error.response.status} ${error.response.statusText}`);
            }
          } else {
            this.lrcAvailable = false;
            this.SET_LYRIC_AVAILABLE(false);
            this.lrcObj.setLyric('');
            this.SET_CURRENT_LYRIC('');
            this.showErrNotif(error.message || error);
          }
        })
    },
  },

  mounted () {
    // 初始化音量
    this.SET_VOLUME(this.player.volume);
    this.initLrcObj();
    this.setupMediaSession();
    if (this.source) {
      this.loadLrcFile();
    }
  }
}
</script>

<style>
.plyr--audio .plyr__controls {
  background-color: inherit !important;
  padding: 0 !important;
}
</style>
