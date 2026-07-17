<template>
  <div>
    <div class="text-h5 text-weight-regular q-ma-md">
      {{ listTitle }}
    </div>

    <div class="row justify-center q-pb-xl q-pt-none">
      <div class="col-11">
        <q-input dense rounded outlined v-model="keyword" :placeholder="searchPlaceholder" class="q-mb-md">
          <template v-slot:append>
            <q-icon v-if="keyword === ''" name="search" />
            <q-icon v-else name="clear" class="cursor-pointer" @click="keyword = ''" />
          </template>
        </q-input>

        <div ref="cloud" class="row justify-center q-gutter-sm" :class="{ 'tag-cloud': isCloudList }">
          <div class="col-auto" v-for="item in displayedItems" :key="item.id" :style="cloudItemStyle(item)">
            <q-btn no-caps rounded :flat="isCloudList" color="primary" :class="{ 'cloud-word': isCloudList }" :label="`${item.name} (${item.count})`" :style="cloudButtonStyle(item)"
              :to="`/works?keyword=${item.name}`" />
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import NotifyMixin from '../mixins/Notification.js'

export default {
  name: 'List',

  mixins: [NotifyMixin],

  props: {
    restrict: {
      type: String
    }
  },

  data() {
    return {
      items: [],
      keyword: '',
      cloudWidth: 1000
    }
  },

  created() {
    this.requestList()
  },

  mounted() {
    this.updateCloudWidth()
    window.addEventListener('resize', this.updateCloudWidth)
  },

  beforeDestroy() {
    window.removeEventListener('resize', this.updateCloudWidth)
  },

  computed: {
    isTagList() {
      return this.restrict === 'tags'
    },

    isCloudList() {
      return this.restrict === 'tags' || this.restrict === 'vas' || this.restrict === 'circles'
    },

    listTitle() {
      switch (this.restrict) {
        case 'tags':
          return 'All tags'
        case 'circles':
          return 'All circles'
        case 'vas':
          return 'All voice actors'
        default:
          return 'All items'
      }
    },

    searchPlaceholder() {
      return this.isTagList ? 'Search tags...' : `Search for a ${this.restrict}...`
    },

    displayedItems() {
      const list = this.keyword ? this.filteredItems : this.items
      return this.isCloudList ? list.slice().sort((a, b) => Number(b.count) - Number(a.count)) : list
    },

    cloudContainerStyle() {
      if (!this.isCloudList) return {}
      return {}
    },

    url() {
      return `/api/${this.restrict}/`
    },

    queryField() {
      switch (this.restrict) {
        case 'circles':
          return 'circleId'
        case 'tags':
          return 'tagId'
        case 'vas':
          return 'vaId'
        default:
          return 'circleId'
      }
    },

    filteredItems() {
      return this.items.filter(item => item.name.toLowerCase().indexOf(this.keyword.toLowerCase()) !== -1)
    }
  },

  watch: {
    url() {
      this.requestList()
    }
  },

  methods: {
    cloudStrength(item) {
      const counts = this.items.map(entry => Math.log((Number(entry.count) || 0) + 1))
      const value = Math.log((Number(item.count) || 0) + 1)
      const min = Math.min(...counts)
      const max = Math.max(...counts)
      return max === min ? 0.5 : (value - min) / (max - min)
    },

    cloudButtonStyle(item) {
      if (!this.isCloudList) return {}

      const ratio = this.cloudStrength(item)
      return {
        fontSize: `${(0.76 + ratio * 1.05).toFixed(2)}rem`,
        fontWeight: ratio >= 0.55 ? '700' : '400',
        minHeight: 'auto',
        padding: '5px 7px'
      }
    },

    cloudItemStyle() {
      return {}
    },

    requestList() {
      this.$axios.get(this.url)
        .then((response) => {
          this.items = response.data.concat()
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
        })
    },

    updateCloudWidth() {
      if (this.$refs.cloud) {
        this.cloudWidth = this.$refs.cloud.clientWidth
      }
    }
  }
}
</script>
<style scoped>
.tag-cloud {
  align-content: center;
  align-items: center;
  display: flex !important;
  flex-wrap: wrap;
  gap: 4px 10px;
  justify-content: center;
  margin-left: auto;
  margin-right: auto;
  max-width: 950px;
  padding: 38px 12% 64px;
  width: 100%;
}

.tag-cloud.q-gutter-sm > * {
  margin: 0;
}

.cloud-word {
  transition: transform 160ms ease, color 160ms ease;
}

.cloud-word:hover {
  color: #1976d2;
  transform: scale(1.22);
  z-index: 1;
}
</style>
