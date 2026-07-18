<template>
  <div class="q-ma-md">
    <q-breadcrumbs gutter="xs" v-if="path.length">
        <q-breadcrumbs-el>
          <q-btn no-caps flat dense size="md" icon="folder" label="ROOT" style="height: 30px;" @click="goToRoot" />
        </q-breadcrumbs-el>

        <q-breadcrumbs-el v-for="(folderName, index) in path" :key="index" class="cursor-pointer">
          <q-btn
            no-caps
            flat
            dense
            size="md"
            icon="folder"
            style="height: 30px;"
            :label="folderName"
            @click="onClickBreadcrumb(index)"
            v-if="index !== path.length - 1"
          />
          <q-btn-dropdown
            v-else
            no-caps
            flat
            dense
            size="md"
            icon="folder"
            style="height: 30px;"
            :label="folderName"
            dropdown-icon="arrow_drop_down"
          >
            <q-list>
              <q-item clickable v-close-popup @click="toggleDefaultPath">
                <q-item-section>Make this the default folder</q-item-section>
                <q-item-section side>
                  <q-icon v-if="isDefaultPath" name="check" color="positive" />
                </q-item-section>
              </q-item>
            </q-list>
          </q-btn-dropdown>
        </q-breadcrumbs-el>
    </q-breadcrumbs>

    <q-card>
      <q-list separator>
        <q-item v-if="!stopLoad" class="non-selectable" style="align-items: center; justify-content: center;">
          <q-spinner-dots color="primary" size="40px" />
        </q-item>
        <q-item
          clickable
          v-ripple
          v-for="(item, index) in fatherFolder"
          :key="index"
          :active="item.type === 'audio' && currentPlayingFile.hash === item.hash"
          active-class="text-white bg-teal"
          @click="onClickItem(item)"
          class="non-selectable"
        >
          <q-item-section avatar>
            <q-icon size="34px" v-if="item.type === 'folder'" color="amber" name="folder" />
            <q-icon size="34px" v-else-if="item.type === 'text'" color="info" name="description" />
            <q-icon size="34px" v-else-if="item.type === 'image'" color="orange" name="photo" />
            <q-icon size="34px" v-else-if="item.type === 'other'" color="info" name="description" />
            <q-btn v-else round dense color="primary" :icon="playIcon(item.hash)" @click="onClickPlayButton(item)" />
          </q-item-section>

          <q-item-section>
            <q-item-label lines="2">{{ item.title }}</q-item-label>
            <q-item-label v-if="item.children" caption lines="1">{{ `${item.children.length} items` }}</q-item-label>

            <!-- 媒体文件时长 -->
            <q-item-label
              v-if="['audio', 'video'].includes(item.type) && typeof item.duration === 'number'"
              caption
              lines="1"
            >
              <!-- <q-icon size="0.8rem" name="schedule" class="q-mr-xs" /> -->
              {{ formatSeconds(item.duration) }}
            </q-item-label>
          </q-item-section>

          <!-- 上下文菜单 -->
          <q-menu
            v-if="item.type === 'audio' || item.type === 'text' || item.type === 'image' || item.type === 'other'"
            touch-position
            context-menu
            auto-close
            transition-show="jump-down"
            transition-hide="jump-up"
          >
            <q-list separator>
              <q-item clickable @click="addToQueue(item)" v-if="item.type === 'audio'">
                <q-item-section>Add to playlist</q-item-section>
              </q-item>

              <q-item clickable @click="playNext(item)" v-if="item.type === 'audio'">
                <q-item-section>Play next</q-item-section>
              </q-item>

              <q-item clickable @click="download(item)">
                <q-item-section>Download file</q-item-section>
              </q-item>
            </q-list>
          </q-menu>
        </q-item>
      </q-list>
    </q-card>

    <!-- 预览窗口 -->
    <q-dialog v-model="showViewer">
      <MediaViewer :files="viewerFiles" :index="viewerFileIndex" @close="showViewer = false" />
    </q-dialog>
    <span class="flex flex-center text-grey">&nbsp;</span>
  </div>
</template>

<script>
// import axios from "axios";
import { mapState, mapGetters } from 'vuex';
import MediaViewer from './MediaViewer.vue';

export default {
  name: 'WorkTree',

  components: {
    MediaViewer
  },

  data() {
    return {
      path: [],
      showViewer: false,
      isViewer: true,
      viewerFiles: [],
      viewerFileIndex: 0,
      stopLoad: false,
      defaultPath: null
    };
  },

  props: {
    tree: {
      type: Array,
      required: true
    },
    workId: {
      type: [String, Number],
      required: true
    }
  },

  watch: {
    tree() {
      this.initPath();
    }
  },

  created() {
    if (this.$q.localStorage.has('isViewer')) {
      this.isViewer = this.$q.localStorage.getItem('isViewer');
    }
  },

  computed: {
    fatherFolder() {
      let fatherFolder = this.tree.concat();
      this.path.forEach(folderName => {
        fatherFolder = fatherFolder.find(item => item.type === 'folder' && item.title === folderName).children;
      });
      return fatherFolder;
    },

    lastPathStorageKey() {
      return `workTreeLastPath:${this.workId}`;
    },

    defaultPathStorageKey() {
      return `workTreeDefaultPath:${this.workId}`;
    },

    isDefaultPath() {
      return Array.isArray(this.defaultPath) && JSON.stringify(this.defaultPath) === JSON.stringify(this.path);
    },

    queue() {
      const queue = [];
      this.fatherFolder.forEach(item => {
        if (item.type === 'audio') {
          queue.push(item);
        }
      });

      return queue;
    },

    ...mapState('AudioPlayer', ['playing']),

    ...mapGetters('AudioPlayer', ['currentPlayingFile'])
  },

  methods: {
    // 播放图标
    playIcon(hash) {
      return this.playing && this.currentPlayingFile.hash === hash ? 'pause' : 'play_arrow';
    },

    initPath() {
      this.defaultPath = this.$q.localStorage.getItem(this.defaultPathStorageKey);
      const savedPath = this.defaultPath ||
        this.$q.localStorage.getItem(this.lastPathStorageKey);
      const initialPath = this.isPathValid(savedPath) ? savedPath.concat() : [];
      let fatherFolder = this.tree.concat();
      if (!initialPath.length) {
        while (fatherFolder.length === 1) {
          if (fatherFolder[0].type === 'audio') {
            break;
          }
          initialPath.push(fatherFolder[0].title);
          fatherFolder = fatherFolder[0].children;
        }
      }
      this.path = initialPath;
      this.rememberPath();
      this.stopLoad = true;
    },

    isPathValid(path) {
      if (!Array.isArray(path)) return false;

      let folder = this.tree;
      return path.every(folderName => {
        const nextFolder = folder.find(item => item.type === 'folder' && item.title === folderName);
        if (!nextFolder || !Array.isArray(nextFolder.children)) return false;
        folder = nextFolder.children;
        return true;
      });
    },

    rememberPath() {
      this.$q.localStorage.set(this.lastPathStorageKey, this.path.concat());
    },

    toggleDefaultPath() {
      if (this.isDefaultPath) {
        this.defaultPath = null;
        this.$q.localStorage.remove(this.defaultPathStorageKey);
        this.$q.notify({ message: 'Default folder cleared for this work', color: 'positive', position: 'bottom' });
        return;
      }

      this.defaultPath = this.path.concat();
      this.$q.localStorage.set(this.defaultPathStorageKey, this.defaultPath);
      this.$q.notify({ message: 'Default folder saved for this work', color: 'positive', position: 'bottom' });
    },

    goToRoot() {
      this.path = [];
      this.rememberPath();
    },

    onClickBreadcrumb(index) {
      this.path = this.path.slice(0, index + 1);
      this.rememberPath();
    },

    onClickItem(item) {
      if (item.type === 'folder') {
        this.path.push(item.title);
        this.rememberPath();
      } else if (item.type === 'text') {
        this.openFile(item);
      } else if (item.type === 'video' || item.type === 'image') {
        if (this.isViewer) {
          this.openViewer(item);
        } else {
          this.openFile(item);
        }
      } else if (item.type === 'other') {
        this.download(item);
      } else if (this.currentPlayingFile.hash !== item.hash) {
        this.$store.commit('AudioPlayer/SET_QUEUE', {
          queue: this.queue.concat(),
          index: this.queue.findIndex(file => file.hash === item.hash),
          resetPlaying: true
        });
      }
    },

    onClickPlayButton(item) {
      if (item.type === 'audio') {
        if (this.currentPlayingFile.hash === item.hash) {
          this.$store.commit('AudioPlayer/TOGGLE_PLAYING');
        } else {
          this.$store.commit('AudioPlayer/SET_QUEUE', {
            queue: this.queue.concat(),
            index: this.queue.findIndex(file => file.hash === item.hash),
            resetPlaying: true
          });
        }
      } else {
        if (this.isViewer) {
          this.openViewer(item);
        } else {
          this.openFile(item);
        }
      }
    },

    addToQueue(file) {
      this.$store.commit('AudioPlayer/ADD_TO_QUEUE', file);
    },

    playNext(file) {
      this.$store.commit('AudioPlayer/PLAY_NEXT', file);
    },

    openFile(file) {
      const token = this.$q.localStorage.getItem('jwt-token') || '';
      // Fallback to old API for an old backend
      const link = document.createElement('a');
      link.href = `${file.mediaStreamUrl}?token=${token}`.replace("#", "%23");
      link.target = '_blank';
      link.click();
    },
    download(file) {
      const token = this.$q.localStorage.getItem('jwt-token') || '';
      // Fallback to old API for an old backend
      const link = document.createElement('a');
      link.href = `${file.mediaDownloadUrl}?token=${token}`.replace("#", "%23");
      link.target = '_blank';
      link.click();
    },
    // 图片&视频查看器
    openViewer(file) {
      this.showViewer = true;
      this.viewerFiles = this.fatherFolder.filter(item => {
        return ['image', 'video'].includes(item.type);
      });
      this.viewerFileIndex = this.viewerFiles.findIndex(item => item.hash === file.hash);
    },

    getFileExt(val) {
      const arr = val.split('.');
      return arr[arr.length - 1];
    },

    formatSeconds(seconds) {
      let h = `${Math.floor(seconds / 3600)}`.padStart(2, '0');
      let m = `${Math.floor((seconds / 60) % 60)}`.padStart(2, '0');
      let s = `${Math.floor(seconds % 60)}`.padStart(2, '0');

      return h === '00' ? m + ':' + s : h + ':' + m + ':' + s;
    }
  }
};
</script>
