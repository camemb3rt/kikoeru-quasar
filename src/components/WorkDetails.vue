<template>
  <div class="row q-ma-md">
    <CoverSFW
      class="col-12 col-md-4 q-pl-md-md q-pt-md-md content-center"
      :workid="metadata.id"
      :nsfw="false"
      :release="metadata.release"
      style="border-radius: 8px; overflow: hidden; max-width: 560px;"
    />

    <div class="col-md-6 col-12 q-pa-sm">
      <div class="q-px-sm q-py-none">
        <!-- 标题 -->
        <div class="text-h6 text-weight-regular">
          <h1
            class="text-h6 text-weight-regular q-mb-none"
            style="overflow-wrap: break-word;"
            :class="{ 'text-black': !$q.dark.isActive, 'text-white': $q.dark.isActive }"
          >
            {{ metadata.title }}
          </h1>
        </div>

        <!-- 社团名 -->
        <div class="text-subtitle1 text-weight-regular">
          <!-- <router-link :to="`/works?keyword=${metadata.circle.name}`" class="text-grey">
            {{ metadata.circle.name }}
          </router-link> -->
          <div class="text-subtitle1 text-weight-regular">
            <span class="text-grey cursor-pointer" @click="toTagSearch(metadata.circle.name)">
              {{ metadata.circle.name }}
            </span>
          </div>
        </div>

        <!-- 评价&评论 -->
        <div class="row items-center q-gutter-xs">
          <!-- 评价 -->
          <div class="col-auto">
            <q-rating
              v-model="rating"
              @input="setRating"
              name="rating"
              size="sm"
              :color="userMarked ? 'blue' : 'amber'"
              icon="star_border"
              icon-selected="star"
              icon-half="star_half"
            />

            <!-- 评价分布明细 -->
            <q-tooltip v-if="metadata.rate_count_detail" content-class="text-subtitle1">
              <div>Average: {{ metadata.rate_average_2dp }}</div>
              <div v-for="(rate, index) in sortedRatings" :key="index" class="row items-center">
                <div class="col">{{ rate.review_point }}</div>

                <!-- 评价占比 -->
                <q-linear-progress
                  :value="rate.ratio / 100"
                  color="amber"
                  track-color="white"
                  style="height: 15px; width: 100px"
                  class="col-auto"
                />

                <div class="col q-mx-sm">({{ rate.count }})</div>
              </div>
            </q-tooltip>
          </div>

          <div class="col-auto">
            <span class="text-weight-medium text-body1 text-red">{{ metadata.rate_average_2dp }}</span>
            <span class="text-grey">({{ metadata.rate_count }})</span>
          </div>

          <!-- 评论数量 -->
          <div class="col-auto q-pl-sm">
            <q-icon name="chat" size="xs" />
            <span class="text-grey">({{ metadata.review_count }})</span>
          </div>

          <!-- 作品时长 -->
          <div class="col-auto q-pl-sm">
            <q-icon name="schedule" size="xs" />
            <span class="text-grey">({{ formatSeconds(metadata.duration) }})</span>
          </div>

          <!-- DLsite链接 -->
          <div class="col-auto">
            <q-icon name="launch" size="xs" />
            <a
              class="text-blue"
              :href="`https://www.dlsite.com/home/work/=/product_id/RJ${metadata.id}.html`"
              rel="noreferrer noopener"
              target="_blank"
            >
              DLsite
            </a>
          </div>
        </div>
      </div>

      <!-- 价格&售出数 -->
      <div class="q-pt-sm q-pb-none">
        <span class="q-mx-sm text-weight-medium text-h6 text-red">{{ metadata.price }} 円</span>
        Sales:
        {{ metadata.dl_count }}
      </div>

      <!-- 标签 -->
      <div class="q-px-none q-py-sm" v-if="showTags">
        <q-chip
          v-for="(tag, index) in metadata.tags"
          :key="index"
          size="md"
          @click.native="toTagSearch(tag.name)"
          class="shadow-4"
          :class="{ 'bg-grey-9': $q.dark.isActive }"
          style="cursor: pointer;"
        >
          {{ tag.name }}
        </q-chip>
      </div>

      <!-- 声优 -->
      <div class="q-px-none q-pt-sm q-py-sm">
        <q-chip
          v-for="(va, index) in metadata.vas"
          :key="index"
          square
          size="md"
          class="shadow-4"
          color="teal"
          text-color="white"
          @click.native="toTagSearch(va.name)"
          style="cursor: pointer;"
        >
          {{ va.name }}
        </q-chip>
      </div>

      <q-btn-dropdown dense class="q-mt-sm shadow-4 q-mx-xs q-pl-sm" color="cyan" label="Progress">
        <q-list>
          <q-item clickable @click="setProgress('marked')" class="q-pa-xs">
            <q-item-section avatar>
              <q-avatar icon="headset" v-show="progress === 'marked'" />
            </q-item-section>
            <q-item-section>
              <q-item-label>Plan to Listen</q-item-label>
            </q-item-section>
          </q-item>

          <q-item clickable @click="setProgress('listening')" class="q-pa-xs">
            <q-item-section avatar>
              <q-avatar icon="headset" v-show="progress === 'listening'" />
            </q-item-section>
            <q-item-section>
              <q-item-label>Listening</q-item-label>
            </q-item-section>
          </q-item>
          <q-item clickable @click="setProgress('listened')" class="q-pa-xs">
            <q-item-section avatar>
              <q-avatar icon="headset" v-show="progress === 'listened'" />
            </q-item-section>
            <q-item-section>
              <q-item-label>Completed</q-item-label>
            </q-item-section>
          </q-item>
          <q-item clickable @click="setProgress('replay')" class="q-pa-xs">
            <q-item-section avatar>
              <q-avatar icon="headset" v-show="progress === 'replay'" />
            </q-item-section>
            <q-item-section>
              <q-item-label>Replaying</q-item-label>
            </q-item-section>
          </q-item>
          <q-item clickable @click="setProgress('postponed')" class="q-pa-xs">
            <q-item-section avatar>
              <q-avatar icon="headset" v-show="progress === 'postponed'" />
            </q-item-section>
            <q-item-section>
              <q-item-label>Postponed</q-item-label>
            </q-item-section>
          </q-item>
        </q-list>
      </q-btn-dropdown>

      <q-btn dense @click="showReviewDialog = true" color="cyan q-mt-sm shadow-4 q-mx-xs q-px-sm" label="Write a review" />

      <WriteReview
        v-if="showReviewDialog"
        @closed="processReview"
        :workid="metadata.id"
        :metadata="metadata"
      ></WriteReview>
    </div>
  </div>
</template>

<script>
import CoverSFW from 'components/CoverSFW';
import WriteReview from './WriteReview';
import NotifyMixin from '../mixins/Notification.js';

export default {
  name: 'WorkDetails',

  mixins: [NotifyMixin],

  components: {
    CoverSFW,
    WriteReview
  },

  props: {
    metadata: {
      type: Object,
      required: true
    }
  },

  data() {
    return {
      rating: 0,
      userMarked: false,
      progress: '',
      showReviewDialog: false,
      showTags: true
    };
  },

  computed: {
    sortedRatings: function() {
      function compare(a, b) {
        return a.review_point > b.review_point ? -1 : 1;
      }
      return this.metadata.rate_count_detail.slice().sort(compare);
    }
  },

  watch: {
    // 需要用watch因为父component pages/work.vue是先用空值初始化的
    metadata(newMetaData) {
      if (newMetaData.userRating) {
        this.userMarked = true;
        this.rating = newMetaData.userRating;
      } else {
        this.userMarked = false;
        this.rating = newMetaData.rate_average_2dp || 0;
      }
      this.progress = newMetaData.progress;

      // 极个别作品没有标签
      if (newMetaData.tags && newMetaData.tags[0].name === null) {
        this.showTags = false;
      }
    }
  },

  methods: {
    setProgress(newProgress) {
      this.progress = newProgress;
      const submitPayload = {
        user_name: this.$store.state.User.name, // 用户名不会被后端使用
        work_id: this.metadata.id,
        progress: newProgress
      };
      this.submitProgress(submitPayload);
    },

    submitProgress(payload) {
      const params = {
        starOnly: false,
        progressOnly: true
      };
      this.$axios
        .put('/api/review', payload, { params })
        .then(response => {
          this.showSuccNotif(response.data.message);
          this.$emit('reset');
        })
        .catch(error => {
          if (error.response) {
            // 请求已发出，但服务器响应的状态码不在 2xx 范围内
            this.showErrNotif(error.response.data.error || `${error.response.status} ${error.response.statusText}`);
          } else {
            this.showErrNotif(error.message || error);
          }
        });
    },

    setRating(newRating) {
      const submitPayload = {
        user_name: this.$store.state.User.name, // 用户名不会被后端使用
        work_id: this.metadata.id,
        rating: newRating
      };
      this.submitRating(submitPayload);
    },

    submitRating(payload) {
      this.$axios
        .put('/api/review', payload)
        .then(response => {
          this.showSuccNotif(response.data.message);
          this.$emit('reset');
        })
        .catch(error => {
          if (error.response) {
            // 请求已发出，但服务器响应的状态码不在 2xx 范围内
            this.showErrNotif(error.response.data.error || `${error.response.status} ${error.response.statusText}`);
          } else {
            this.showErrNotif(error.message || error);
          }
        });
    },

    processReview() {
      this.showReviewDialog = false;
    },

    toTagSearch(tagName) {
      const keyword = this.$q.sessionStorage.has('keyword') ? this.$q.sessionStorage.getItem('keyword').join(';') : '';
      if (tagName !== keyword) {
        this.$router.push({ name: 'works', query: { keyword: tagName } });
      }
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
<style scoped>
/* optional: 添加一些样式，让它看起来更像按钮 */
.q-chip {
  cursor: pointer; /* 确保有点击效果 */
}
</style>
