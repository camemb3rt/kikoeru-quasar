<template>
  <q-page padding>
    <div class="fit row wrap justify-between items-start q-px-sm">
      <div class="col-lg-3 col-sm-12 col-xs-12">
        <q-btn-toggle v-model="mode" @input="changeMode" spread no-caps rounded toggle-color="primary" class="text-bold"
          :class="{ 'bg-black': $q.dark.isActive }" :options="[
            { label: 'Favourites', value: 'favorite' },
            { label: 'Reviews', value: 'review' },
            { label: 'Progress', value: 'progress' }
          ]" />
      </div>
      <div class="col-auto gt-sm row">
        <q-select dense rounded outlined v-model="sortBy" :options="sortOptions" class="q-mx-sm"
          :bg-color="$q.dark.isActive ? 'black' : 'white'">
        </q-select>
        <q-btn :disable="sortButtonDisabled" dense rounded :icon="direction ? 'arrow_downward' : 'arrow_upward'"
          :class="{ 'bg-black': $q.dark.isActive }" @click="switchSortMode" />
      </div>

    </div>
    <div class="q-pt-md q-px-sm">
      <q-btn-toggle v-if="mode === 'progress'" v-model="progressFilter" @input="changeProgressFilter"
        toggle-color="primary" rounded :class="{ 'bg-black': $q.dark.isActive }" :options="[
          { label: 'Plan to Listen', value: 'marked' },
          { label: 'Listening', value: 'listening' },
          { label: 'Completed', value: 'listened' },
          { label: 'Replaying', value: 'replay' },
          { label: 'Postponed', value: 'postponed' }
        ]" />
    </div>

    <div class="q-pt-md">
      <div class="q-px-sm q-py-md">
        <q-infinite-scroll @load="onLoad" :offset="500" :disable="stopLoad" ref="scroll">
          <div class="row justify-center text-grey" v-if="works.length === 0">{{ mode === 'favorite' ? 'Heart works to add them to your favourites.' : 'Rate or mark progress on a work to have it appear here' }}</div>
          <q-list bordered separator class="shadow-2" v-if="works.length">
            <FavListItem v-for="work in works" :key="work.id" :workid="work.id" :metadata="work" @reset="reset()"
              :mode="mode"></FavListItem>
          </q-list>
          <template v-slot:loading>
            <div class="row justify-center q-my-md">
              <q-spinner-dots color="primary" size="40px" />
            </div>
          </template>
        </q-infinite-scroll>
      </div>
    </div>
  </q-page>
</template>

<script>
import FavListItem from 'components/FavListItem'
import NotifyMixin from '../mixins/Notification.js'

export default {
  name: 'Favourites',

  mixins: [NotifyMixin],

  components: {
    FavListItem
  },

  props: {
    route: {
      type: String,
      default: 'favorite'
    },
    progress: {
      type: String,
      default: 'marked'
    }
  },

  computed: {
    direction() {
      return this.sortMode === 'desc'
    },

    sortButtonDisabled() {
      return this.sortBy.order === 'allage' || this.sortBy.order === 'nsfw'
    }
  },

  data() {
    return {
      mode: 'favorite',
      progressFilter: 'marked',
      works: [],
      stopLoad: false,
      pagination: { currentPage: 0, pageSize: 12, totalCount: 0 },
      sortMode: 'desc',
      sortBy: {
        label: 'Favourited Time',
        order: 'updated_at'
      },
      sortOptions: [
        {
          label: 'Favourited Time',
          order: 'updated_at'
        },
        {
          label: 'Rating',
          order: 'userRating'
        },
        {
          label: 'Release Date',
          order: 'release'
        },
        {
          label: 'Review Count',
          order: 'review_count'
        },
        {
          label: 'Sales Count',
          order: 'dl_count'
        },
        {
          label: 'SFW',
          order: 'allage'
        },
        {
          label: 'NSFW',
          order: 'nsfw'
        }
      ]
    }
  },

  created() {
    this.mode = this.route;
    this.progressFilter = this.progress;
  },

  mounted() {
    if (localStorage.sortByFavourites) {
      try {
        this.sortBy = JSON.parse(localStorage.sortByFavourites);
      } catch {
        localStorage.removeItem('sortByFavourites');
      }
    }
  },

  watch: {
    sortBy(newSortOptionSetting) {
      localStorage.sortByFavourites = JSON.stringify(newSortOptionSetting);
      this.reset();
    },

    sortMode() {
      this.reset();
    },

    // Browser back and forth
    route() {
      this.mode = this.route;
      this.reset();
    },
    progress() {
      this.progressFilter = this.progress;
      this.reset();
    }
  },

  methods: {
    // Split two-way binding
    changeMode(newMode) {
      this.works = []
      this.$router.push(`/favourites/${newMode}`);
      this.reset();
    },

    // Split two-way binding
    changeProgressFilter(newFilter) {
      this.$router.push(`/favourites/progress/${newFilter}`);
      this.reset();
    },

    switchSortMode() {
      if (this.sortMode === 'desc') {
        this.sortMode = 'asc'
      } else {
        this.sortMode = 'desc'
      }
    },

    onLoad(index, done) {
      this.requestWorksQueue()
        .then(() => done())
    },

    reset() {
      // Freeze the scroller first
      this.stopLoad = true
      this.pagination = { currentPage: 0, pageSize: 12, totalCount: 0 }
      // Manually fetch first page content before enable scroller
      // Note: the internal API of the infinite scroller does not work well
      this.requestWorksQueue()
        .then(() => {
          this.stopLoad = false
        })
    },

    requestWorksQueue() {
      const params = {
        order: this.sortBy.order,
        sort: this.sortMode,
        page: this.pagination.currentPage + 1 || 1
      }

      if (this.sortBy.order === 'allage') {
        params.order = 'nsfw'
        params.sort = 'asc'
      }

      if (this.sortBy.order === 'nsfw') {
        params.order = 'nsfw'
        params.sort = 'desc'
      }

      if (this.mode === 'progress') {
        params.filter = this.progressFilter;
      }
      if (this.mode === 'favorite') {
        params.favorite = true;
      }

      return this.$axios.get('/api/review', { params })
        .then((response) => {
          const works = response.data.works
          this.works = (params.page === 1) ? works.concat() : this.works.concat(works)
          this.pagination = response.data.pagination

          if (this.works.length >= this.pagination.totalCount) {
            this.stopLoad = true
          }
        })
        .catch((error) => {
          if (error.response) {
            // 请求已发出，但服务器响应的状态码不在 2xx 范围内
            if (error.response.status !== 401) {
              this.showErrNotif(error.response.data.error || `${error.response.status} ${error.response.statusText}`)
            }
          } else {
            this.showErrNotif(error.message || error)
          }
          this.stopLoad = true
        })
    },
  }
}
</script>
