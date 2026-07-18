<template>
  <q-item clickable class="row fav-list-item" :class="{ 'bg-black': $q.dark.isActive }">
    <q-item-section class="col-auto" top>
      <router-link :to="`/work/RJ${metadata.id}`">
        <q-img transition="fade" :src="coverUrl" style="height: 120px; width: 160px;" />
      </router-link>
    </q-item-section>

    <q-item-section class="q-gutter-y-xs column items-start" top v-on:click.self="showReviewDialog = true">
      <q-item-label lines="2" class="text-body2">
        <router-link :to="`/work/RJ${metadata.id}`" class="col-auto" style="color: inherit;">
          {{ metadata.title }}
        </router-link>
      </q-item-label>

      <div class="row q-gutter-x-sm col-auto">
        <router-link :to="`/works?keyword=${metadata.circle.name}`" class="col-auto text-grey">
          {{ metadata.circle.name }}
        </router-link>

        <span class="col-auto">/</span>
        <span class="col-auto text-grey"> {{ metadata.release }}</span>
        <span class="col-auto">/</span>

        <router-link v-for="(va, index) in metadata.vas" :key=index :to="`/works?keyword=${va.name}`"
          class="col-auto text-primary">
          {{ va.name }}
        </router-link>
      </div>

      <div v-if="tags.length" class="row q-gutter-xs">
        <q-chip v-for="tag in tags" :key="tag.id || tag.name" dense size="sm" color="grey-8" text-color="white" class="favorite-tag cursor-pointer" :class="{ 'favorite-tag-match': matchesTagFilter(tag.name) }" @click.native.stop="$emit('filter-tag', tag.name)">
          {{ tag.name }}
        </q-chip>
      </div>

      <div class="row items-center q-gutter-x-xs">
        <q-rating v-if="!hideRating" v-model="rating" @input="setRating" size="sm" color="blue" icon="star_border"
          icon-selected="star" icon-half="star_half" class="col-auto" />
        <span class="col-auto text-grey ">{{ metadata.updated_at }}</span>
      </div>

      <q-item-label class="q-pt-sm" v-if="mode === 'review'">
        <q-card class="my-card col-auto" @click="showReviewDialog = true" v-show="metadata.review_text">
          <q-card-section class="q-pa-sm">
            <pre class="q-ma-none">{{ metadata.review_text }}</pre>
          </q-card-section>
        </q-card>
      </q-item-label>

      <q-item-label class="q-pt-xs" v-if="mode === 'progress'">
        <q-btn-toggle v-if="mode === 'progress'" v-model="progress" @input="setProgress" dense no-caps rounded
          toggle-color="primary" color="white" text-color="black" :options="[
          { label: 'Plan to Listen', value: 'marked' },
          { label: 'Listening', value: 'listening' },
          { label: 'Completed', value: 'listened' },
          { label: 'Replaying', value: 'replay' },
          { label: 'Postponed', value: 'postponed' }
          ]" />
      </q-item-label>
    </q-item-section>

    <q-item-section v-if="mode === 'favorite' || mode === 'progress'" side class="favorite-remove-action">
      <q-btn round dense flat color="red" icon="close" @click.stop="removeFromCurrentList">
        <q-tooltip>{{ mode === 'favorite' ? 'Remove from favourites' : 'Clear progress' }}</q-tooltip>
      </q-btn>
    </q-item-section>

    <WriteReview v-if="showReviewDialog" @closed="processReview" :workid="workid" :metadata="metadata"></WriteReview>

  </q-item>
</template>

<script>
import WriteReview from './WriteReview'
import NotifyMixin from '../mixins/Notification.js'

export default {
  name: 'FavListItem',

  mixins: [NotifyMixin],

  components: {
    WriteReview
  },

  props: {
    workid: {
      type: String,
      required: true
    },
    metadata: {
      type: Object,
      required: true
    },
    mode: {
      type: String,
      default: 'review'
    },
    tagFilter: {
      type: String,
      default: ''
    }
  },

  data() {
    return {
      rating: 0,
      showReviewDialog: false,
      hideRating: false,
      progress: ''
    }
  },
  computed: {
    coverUrl() {
      // 从 LocalStorage 中读取 token
      const token = this.$q.localStorage.getItem('jwt-token') || ''
      return this.workid ? `/api/cover/${this.workid}?type=240x240&token=${token}` : ""
    },

    tags() {
      return Array.isArray(this.metadata.tags) ? this.metadata.tags.filter(tag => tag && tag.name) : [];
    }
  },

  mounted() {
    // 可以用mounted因为初始化时metadata不为空
    this.setMetadata();
  },

  watch: {
    // 需要watch metadata 当父component刷新metadata时更新
    metadata() {
      this.setMetadata();
    }
  },

  methods: {
    setMetadata() {
      if (this.metadata.userRating) {
        this.rating = this.metadata.userRating;
      } else {
        this.hideRating = true;
      }
      if (!this.rating) {
        this.hideRating = true;
      } else {
        this.hideRating = false;
      }

      this.progress = this.metadata.progress;
    },

    removeFavorite() {
      this.$axios.put('/api/review/favorite', { work_id: this.metadata.id, favorite: false })
        .then(response => {
          this.showSuccNotif(response.data.message);
          this.$emit('reset');
        })
        .catch(error => {
          this.showErrNotif(error.response ? error.response.data.error : error.message);
        });
    },

    removeFromCurrentList() {
      if (this.mode === 'favorite') {
        this.removeFavorite();
      } else {
        this.clearProgress();
      }
    },

    clearProgress() {
      this.progress = '';
      this.submitProgress({
        user_name: this.$store.state.User.name,
        work_id: this.metadata.id,
        progress: null
      });
    },

    matchesTagFilter(tagName) {
      const tagTerms = this.tagFilter.toLowerCase().split(',').map(tag => tag.trim()).filter(Boolean);
      const normalizedTagName = tagName.toLowerCase();
      return tagTerms.some(term => normalizedTagName.includes(term));
    },

    processReview(modified) {
      if (modified) {
        this.calledFromChild = true;
        this.$emit('reset');
      }
      this.showReviewDialog = false;
    },

    setRating(newRating) {
      // 取消标星可能是操作失误，所以不响应。应使用删除标记来删除打星
      if (newRating) {
        const submitPayload = {
          'user_name': this.$store.state.User.name, // 用户名不会被后端使用
          'work_id': this.metadata.id,
          'rating': newRating
        };
        this.submitRating(submitPayload);
      }
    },

    submitRating(payload) {
      const params = {
        starOnly: true
      }
      this.$axios.put('/api/review', payload, { params })
        .then((response) => {
          this.showSuccNotif(response.data.message)
        })
        .then(() => this.$emit('reset'))
        .catch((error) => {
          if (error.response) {
            // 请求已发出，但服务器响应的状态码不在 2xx 范围内
            this.showErrNotif(error.response.data.error || `${error.response.status} ${error.response.statusText}`)
          } else {
            this.showErrNotif(error.message || error)
          }
        })
    },

    setProgress(newProgress) {
      const submitPayload = {
        'user_name': this.$store.state.User.name, // 用户名不会被后端使用
        'work_id': this.metadata.id,
        'progress': newProgress
      };
      this.submitProgress(submitPayload);
    },

    submitProgress(payload) {
      const params = {
        starOnly: false,
        progressOnly: true
      }
      this.$axios.put('/api/review', payload, { params })
        .then((response) => {
          this.showSuccNotif(response.data.message)
        })
        .then(() => this.$emit('reset'))
        .catch((error) => {
          if (error.response) {
            // 请求已发出，但服务器响应的状态码不在 2xx 范围内
            this.showErrNotif(error.response.data.error || `${error.response.status} ${error.response.statusText}`)
          } else {
            this.showErrNotif(error.message || error)
          }
        })
    },
  }

}
</script>

<style scoped>
.favorite-remove-action {
  opacity: 0;
  transition: opacity 160ms ease;
}

.fav-list-item:hover .favorite-remove-action {
  opacity: 1;
}

.favorite-tag {
  transition: background-color 160ms ease, color 160ms ease;
}

.favorite-tag:hover,
.favorite-tag-match {
  background-color: var(--q-color-primary) !important;
  color: white !important;
}
</style>
