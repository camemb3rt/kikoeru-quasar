<template>
  <q-form @submit="onSubmit" style="width: 260px;" class="absolute-center	q-gutter-md">
    <q-input filled v-model="name" label="Username" class="fit"
      lazy-rules
      :rules="[ val => val.length >= 5 || 'Must be at least 5 characters' ]"
    />
    
    <q-input filled type="password" v-model="password" label="Password"  class="fit"
      lazy-rules
      :rules="[ val => val.length >= 5 || 'Must be at least 5 characters' ]"
    />

    <q-btn label="Log in" type="submit" color="primary" class="fit" />
  </q-form>
</template>
   
<script>
import { setAxiosHeaders } from 'boot/axios'
import NotifyMixin from '../mixins/Notification.js'

export default {
  mixins: [NotifyMixin],

  data () {
    return {
      name: '',
      password: '',
    }
  },

  methods: {
    onSubmit () {
      this.$axios.post('/api/auth/me', {
        name: this.name,
        password: this.password
      })
        .then((res) => {
          try {
            this.$q.localStorage.set('jwt-token', res.data.token)
            setAxiosHeaders(res.data.token)
            this.showSuccNotif('Login successful')
            this.$router.push('/')
          } catch (error) {
            // 由于Web Storage API错误，
            // 数据未成功保存
            this.showErrNotif(error.message)
          }
        })
        .catch((error) => {
          if (error.response) {
            // 请求已发出，但服务器响应的状态码不在 2xx 范围内
            if (error.response.status === 401) {
              this.showWarnNotif(error.response.data.error)
            } else {
              this.showErrNotif(error.response.data.error || `${error.response.status} ${error.response.statusText}`)
            }
          } else {
            this.showErrNotif(error.message || error)
          }
        })
    }, 
  }
}
</script>