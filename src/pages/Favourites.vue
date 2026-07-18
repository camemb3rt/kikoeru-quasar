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
      <div class="col-auto row items-center">
        <q-rating
          v-if="mode === 'review'"
          v-model="reviewRatingFilter"
          :max="5"
          clearable
          color="amber"
          icon="star_border"
          icon-selected="star"
          class="q-mx-sm"
          @input="reset"
        />
        <q-input
          v-model="tagFilter"
          dense
          rounded
          outlined
          clearable
          debounce="400"
          label="Filter by tag"
          class="q-mx-sm favourites-tag-filter"
          :bg-color="$q.dark.isActive ? 'black' : 'white'"
          @input="onTagFilterInput"
          @focus="showTagFilterMenu = tagTerms.length > 0"
        >
          <template v-slot:append>
            <q-icon name="sell" />
            <q-icon v-if="tagTerms.length" name="arrow_drop_down" class="cursor-pointer" @click.stop="showTagFilterMenu = !showTagFilterMenu" />
          </template>
          <q-menu v-model="showTagFilterMenu" anchor="bottom left" self="top left">
            <q-list dense style="min-width: 220px;">
              <q-item v-for="tag in tagTerms" :key="tag">
                <q-item-section>{{ tag }}</q-item-section>
                <q-item-section side>
                  <q-btn flat round dense size="sm" icon="close" @click="removeTagFilter(tag)" />
                </q-item-section>
              </q-item>
            </q-list>
          </q-menu>
        </q-input>
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
              :mode="mode" :tag-filter="tagFilter" @filter-tag="addTagFilter"></FavListItem>
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
    },

    tagTerms() {
      return (this.tagFilter || '').split(',').map(tag => tag.trim()).filter(Boolean);
    }
  },

  data() {
    return {
      mode: 'favorite',
      progressFilter: 'marked',
      reviewRatingFilter: 0,
      tagFilter: '',
      showTagFilterMenu: false,
      works: [],
      stopLoad: false,
      pagination: { currentPage: 0, pageSize: 12, totalCount: 0 },
      requestId: 0,
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

    addTagFilter(tagName) {
      const tags = this.tagTerms.concat();
      if (tags.includes(tagName)) {
        this.tagFilter = tags.filter(tag => tag !== tagName).join(', ');
      } else {
        tags.push(tagName);
        this.tagFilter = tags.join(', ');
      }
      this.showTagFilterMenu = this.tagTerms.length > 0;
      this.reset();
    },

    onTagFilterInput(value) {
      this.tagFilter = value || '';
      this.showTagFilterMenu = this.tagTerms.length > 0;
      this.reset();
    },

    removeTagFilter(tagName) {
      this.tagFilter = this.tagTerms.filter(tag => tag !== tagName).join(', ');
      this.showTagFilterMenu = this.tagTerms.length > 0;
      this.reset();
    },

    onLoad(index, done) {
      this.requestWorksQueue()
        .then(() => done())
    },

    reset() {
      this.requestId += 1;
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
      const requestId = this.requestId;
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
      if (this.mode === 'review') {
        params.review = true;
        if (this.reviewRatingFilter) {
          params.minRating = this.reviewRatingFilter;
        }
      }
      const tagFilter = (this.tagFilter || '').trim();
      if (tagFilter) {
        params.tag = tagFilter;
      }

      return this.$axios.get('/api/review', { params })
        .then((response) => {
          if (requestId !== this.requestId) return;
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

<style scoped>
.favourites-tag-filter {
  width: 260px;
}
</style>
