<template>
  <q-layout view="hHh Lpr lFf" :class="{ 'bg-grey-3': !$q.dark.isActive }">
    <q-header class="shadow-4" :class="{ 'bg-dark': $q.dark.isActive }">
      <q-toolbar class="row justify-between">
        <q-btn flat dense round @click="drawerOpen = !drawerOpen" icon="menu" aria-label="Menu" />
        <!-- 左侧-返回按钮 -->
        <q-btn flat size="md" icon="arrow_back_ios" @click="back()" v-if="isNotAtHomePage" />
        <!-- 左侧-"Kikoeru"文字 -->
        <q-toolbar-title class="gt-xs">
          <router-link to="/" class="text-white" @click.native="index()">
            Kikoeru
          </router-link>
        </q-toolbar-title>
        <!-- 右侧-搜索栏 -->
        <q-input
          dark
          dense
          standout
          v-model="editKeyword"
          @keyup.enter="onAddSearchKeyword"
          input-class="text-left"
          class="q-mr-sm"
        >
          <template v-slot:prepend>
            <q-chip class="q-ma-xs" v-for="(meta, index) in keywords" :key="meta">
              {{ meta }}
              <q-btn
                class="q-ml-sm search-tag-close-btn"
                padding="xs"
                round
                flat
                size="xs"
                icon="close"
                @click="onRemoveSearchKeyword(index)"
              />
            </q-chip>
          </template>
          <template v-slot:append>
            <q-icon v-if="keywords.length === 0" name="search" />
            <q-icon v-else name="clear" class="cursor-pointer" @click="onRemoveAllSearchKeyword()" />
          </template>
        </q-input>
      </q-toolbar>

      <AudioPlayer />
    </q-header>

    <q-drawer
      v-model="drawerOpen"
      show-if-above
      :mini="miniState"
      @mouseover="miniState = false"
      @mouseout="miniState = true"
      mini-to-overlay
      :width="230"
      :breakpoint="500"
      bordered
      :content-class="{ 'bg-grey-1': !$q.dark.isActive }"
    >
      <q-scroll-area class="fit">
        <q-list>
          <q-item
            clickable
            v-ripple
            exact
            :to="link.path"
            active-class="text-deep-purple text-weight-medium"
            v-for="(link, index) in links"
            :key="index"
            @click="miniState = true"
          >
            <q-item-section avatar>
              <q-icon :name="link.icon" />
            </q-item-section>

            <q-item-section>
              <q-item-label class="text-subtitle1">
                {{ link.title }}
              </q-item-label>
            </q-item-section>
          </q-item>

          <q-item clickable v-ripple exact active-class="text-deep-purple text-weight-medium" @click="randomPlay">
            <q-item-section avatar>
              <q-icon name="shuffle" />
            </q-item-section>

            <q-item-section>
              <q-item-label class="text-subtitle1">
                Random Play
              </q-item-label>
            </q-item-section>
          </q-item>

          <q-item clickable v-ripple exact active-class="text-deep-purple text-weight-medium" @click="showTimer = true">
            <q-item-section avatar>
              <q-icon name="bedtime" />
            </q-item-section>

            <q-item-section>
              <q-item-label class="text-subtitle1">
                Sleep Mode
              </q-item-label>
            </q-item-section>
          </q-item>
        </q-list>

        <q-list>
          <q-item clickable v-ripple exact active-class="text-deep-purple text-weight-medium" @click="toggleDarkMode">
            <q-item-section avatar>
              <q-icon
                :name="getDarkMode() === 'auto' ? 'brightness_medium' : getDarkMode() ? 'mode_night' : 'light_mode'"
              />
            </q-item-section>

            <q-item-section>
              <q-item-label class="text-subtitle1">
                Dark Mode
              </q-item-label>
              <q-item-label class="text-caption text-grey">
                {{ $q.dark.mode === 'auto' ? 'Follow System' : $q.dark.mode === true ? 'Enabled' : 'Disabled' }}
              </q-item-label>
            </q-item-section>
          </q-item>

          <q-item clickable v-ripple exact :to="'/settings'" active-class="text-deep-purple text-weight-medium">
            <q-item-section avatar>
              <q-icon name="tune" />
            </q-item-section>

            <q-item-section>
              <q-item-label class="text-subtitle1">
                Settings
              </q-item-label>
            </q-item-section>
          </q-item>

          <q-item
            clickable
            v-ripple
            exact
            :to="'/admin'"
            active-class="text-deep-purple text-weight-medium"
            v-if="userName === 'admin'"
          >
            <q-item-section avatar>
              <q-icon name="dashboard" />
            </q-item-section>

            <q-item-section>
              <q-item-label class="text-subtitle1">
                Admin Panel
              </q-item-label>
            </q-item-section>
          </q-item>

          <q-item
            clickable
            v-ripple
            exact
            active-class="text-deep-purple text-weight-medium"
            @click="confirm = true"
            v-if="authEnabled"
          >
            <q-item-section avatar>
              <q-icon name="exit_to_app" />
            </q-item-section>

            <q-item-section>
              <q-item-label class="text-subtitle1">
                Logout
              </q-item-label>
              <q-item-label caption lines="2">{{ userName }}</q-item-label>
            </q-item-section>
          </q-item>
        </q-list>
      </q-scroll-area>
    </q-drawer>

    <q-dialog v-model="confirm" persistent>
      <q-card>
        <q-card-section class="row items-center">
          <q-avatar icon="power_settings_new" color="primary" text-color="white" />
          <span class="q-ml-sm">Are you sure you want to log out?</span>
        </q-card-section>

        <q-card-actions align="right">
          <q-btn flat label="Cancel" color="primary" v-close-popup />
          <q-btn flat label="Log out" color="primary" @click="logout()" v-close-popup />
        </q-card-actions>
      </q-card>
    </q-dialog>

    <SleepMode v-model="showTimer" />

    <q-page-container>
      <!-- <q-page padding> -->
      <keep-alive include="Works">
        <router-view />
      </keep-alive>
      <!-- </q-page> -->
      <q-page-scroller position="bottom-right" :scroll-offset="150" :offset="[18, 18]">
        <q-btn fab icon="keyboard_arrow_up" color="accent" />
      </q-page-scroller>
    </q-page-container>

    <q-footer class="q-pa-none">
      <PlayerBar />
    </q-footer>

    <LyricsBar />
  </q-layout>
</template>

<script>
import PlayerBar from 'components/PlayerBar';
import AudioPlayer from 'components/AudioPlayer';
import LyricsBar from 'components/LyricsBar';
import SleepMode from 'components/SleepMode';
import NotifyMixin from '../mixins/Notification.js';
import { mapMutations, mapState } from 'vuex';

export default {
  name: 'MainLayout',

  mixins: [NotifyMixin],

  components: {
    PlayerBar,
    AudioPlayer,
    LyricsBar,
    SleepMode
  },

  data() {
    return {
      editKeyword: '',
      keywords: [],
      drawerOpen: false,
      miniState: true,
      confirm: false,
      randId: null,
      showTimer: false,
      links: [
        { title: 'Library', icon: 'widgets', path: '/' },
        { title: 'My Favourites', icon: 'favorite', path: '/favourites' },
        { title: 'Circles', icon: 'group', path: '/circles' },
        { title: 'Tags', icon: 'label', path: '/tags' },
        { title: 'VAs', icon: 'mic', path: '/vas' }
      ],
      sharedConfig: {}
    };
  },

  watch: {
    randId() {
      this.$router.push(`/work/RJ${this.randId}`);
    },

    '$route.query': {
      handler: function(query) {
        const keyword = query.keyword ? query.keyword : '';
        if (this.$route.path === '/works' && keyword !== this.keywords.join(';')) {
          this.keywords = keyword !== '' ? keyword.split(';') : [];
        }
      }
    }
  },

  mounted() {
    this.initKeyword();
    this.initUser();
    this.checkUpdate();
    this.readSharedConfig();
  },

  computed: {
    isNotAtHomePage() {
      const path = this.$route.path;
      return path && path !== '/' && path !== '/works' && path !== '/favourites';
    },

    ...mapState('User', {
      userName: 'name',
      authEnabled: 'auth'
    })
  },

  methods: {
    ...mapMutations('AudioPlayer', ['SET_REWIND_SEEK_TIME', 'SET_FORWARD_SEEK_TIME']),

    initKeyword() {
      if (this.$q.sessionStorage.has('keyword')) {
        this.keywords = this.$q.sessionStorage.getItem('keyword');
      }
      if (this.$route.query.keyword) {
        this.keywords = this.$route.query.keyword.split(";")
      }
    },

    initUser() {
      this.$axios
        .get('/api/auth/me')
        .then(res => {
          this.$store.commit('User/INIT', res.data.user);
          this.$store.commit('User/SET_AUTH', res.data.auth);
        })
        .catch(error => {
          if (error.response) {
            // 请求已发出，但服务器响应的状态码不在 2xx 范围内
            if (error.response.status === 401) {
              // this.showWarnNotif(error.response.data.error)
              // 验证失败，跳转到登录页面
              const path = this.$router.currentRoute.path;
              if (path !== '/login') {
                this.$router.push('/login');
              }
            } else {
              this.showErrNotif(error.response.data.error || `${error.response.status} ${error.response.statusText}`);
            }
          } else {
            this.showErrNotif(error.message || error);
          }
        });
    },

    checkUpdate() {
      this.$axios
        .get('/api/version')
        .then(res => {
          if (res.data.update_available && res.data.notifyUser) {
            this.$q.notify({
              message: 'A new version is available on GitHub (this links to a different fork)',
              color: 'primary',
              textColor: 'white',
              icon: 'cloud_download',
              timeout: 5000,
              actions: [
                { label: 'OK', color: 'white' },
                {
                  label: 'View',
                  color: 'white',
                  handler: () => {
                    Object.assign(document.createElement('a'), {
                      target: '_blank',
                      href: 'https://github.com/umonaca/kikoeru-express/releases'
                    }).click();
                  }
                }
              ]
            });
          }

          if (res.data.lockFileExists) {
            this.$q.notify({
              message: res.data.lockReason,
              type: 'warning',
              timeout: 60000,
              actions: [
                { label: 'Remind me later', color: 'black' },
                { label: 'Open scanner page', color: 'black', handler: () => this.$router.push('/admin/scanner') }
              ]
            });
          }
        })
        .catch(error => {
          console.error(error);
        });
    },

    readSharedConfig() {
      this.$axios
        .get('/api/config/shared')
        .then(response => {
          this.sharedConfig = response.data.sharedConfig;
        })
        .catch(error => {
          if (error.response) {
            // 请求已发出，但服务器响应的状态码不在 2xx 范围内
            if (error.response.status === 401) {
              // this.showWarnNotif(error.response.data.error)
              // 验证失败，跳转到登录页面
              const path = this.$router.currentRoute.path;
              if (path !== '/login') {
                this.$router.push('/login');
              }
            } else {
              this.showErrNotif(error.response.data.error || `${error.response.status} ${error.response.statusText}`);
            }
          } else {
            this.showErrNotif(error.message || error);
          }
        });
    },

    randomPlay() {
      this.requestRandomWork();
    },

    requestRandomWork() {
      const params = {
        order: 'betterRandom'
      };
      this.$axios
        .get('/api/works', { params })
        .then(response => {
          const works = response.data.works;
          this.randId = works.length ? works[0].id : null;
        })
        .catch(error => {
          if (error.response) {
            // 请求已发出，但服务器响应的状态码不在 2xx 范围内
            if (error.response.status !== 401) {
              this.showErrNotif(error.response.data.error || `${error.response.status} ${error.response.statusText}`);
            }
          } else {
            this.showErrNotif(error.message || error);
          }
        });
    },
    // 深色功能
    toggleDarkMode() {
      const darkMode = this.getDarkMode();
      console.log('toggleDarkMode called');
      if (darkMode === true) {
        this.$q.dark.set('auto');
      } else if (darkMode == 'auto') {
        this.$q.dark.set(false);
      } else {
        this.$q.dark.set(true);
      }
      this.$q.localStorage.set('darkMode', this.$q.dark.mode);
    },
    getDarkMode() {
      return this.$q.localStorage.getItem('darkMode');
    },
    // 搜索功能
    onAddSearchKeyword() {
      const keyword = this.editKeyword.trim();
      if (keyword === '') {
        this.showErrNotif('Cannot add blank keyword');
        return;
      }

      for (let kw of this.keywords) {
        if (kw === keyword) {
          this.showErrNotif('Duplicate keyword, failed to add');
          return;
        }
      }
      this.keywords.push(keyword);
      this.editKeyword = '';
      this.$router.push({ name: 'works', query: { keyword: this.keywords.join(';') } });
    },

    onRemoveSearchKeyword(index) {
      this.keywords.splice(index, 1);
      if (this.keywords.length) {
        this.$router.push({ name: 'works', query: { keyword: this.keywords.join(';') } });
      } else {
        this.$router.push('/');
      }
    },

    onRemoveAllSearchKeyword() {
      this.keywords = [];
      this.$router.push('/');
    },

    logout() {
      this.$q.localStorage.set('jwt-token', '');
      this.$router.push('/login');
    },

    index() {
      this.keywords = [];
      this.$q.sessionStorage.set('keyword', this.keywords);
    },

    back() {
      this.$router.go(-1);
    }
  },
  created() {
    this.$q.dark.set(this.getDarkMode());
  }
};
</script>

<style lang="scss">
// 侧边栏底部按钮
aside.q-drawer div.q-scrollarea > div.scroll > div {
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  height: 100%;
}
</style>
